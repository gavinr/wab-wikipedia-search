define(['dojo/_base/declare', 'jimu/BaseWidget', 'esri/request', 'esri/geometry/Point', 'esri/symbols/SimpleMarkerSymbol', 'esri/symbols/SimpleLineSymbol', 'esri/InfoTemplate', 'esri/graphic', 'esri/layers/GraphicsLayer', 'esri/graphicsUtils', 'dojo/_base/Color', 'dojo/html', 'dijit/focus', 'dijit/_WidgetsInTemplateMixin', 'dijit/form/TextBox', 'dojox/form/BusyButton'], function (declare, BaseWidget, esriRequest, Point, SimpleMarkerSymbol, SimpleLineSymbol, InfoTemplate, Graphic, GraphicsLayer, graphicsUtils, Color, html, focusUtil, _WidgetsInTemplateMixin, TextBox, BusyButton) {
  return declare([BaseWidget, _WidgetsInTemplateMixin], {

    baseClass: 'wikipedia-search',

    formSubmit: function formSubmit(evt) {
      var _this = this;

      evt.preventDefault();
      evt.stopPropagation();

      this.clearGraphicsLayer();
      this.wikipediaSearch(this.queryText.get('value')).then(function (searchResults) {
        // get coords
        _this.getCoordsForArray(searchResults[1]).then(function (locationResults) {
          _this.mapLocations(locationResults);
          _this.zoomToCurrentGraphics();
        });
      });
    },
    wikipediaSearch: function wikipediaSearch(searchQuery) {
      var req = {
        url: 'https://cors-anywhere.herokuapp.com/en.wikipedia.org/w/api.php',
        content: {
          'action': 'opensearch',
          'search': searchQuery,
          'limit': '50',
          'namespace': '0',
          'format': 'json'
        },
        'withCredentials': false
      };
      return esriRequest(req);
    },
    getCoordsForArray: function getCoordsForArray(namesArr) {
      var _this2 = this;

      return new Promise(function (resolve, reject) {
        // do 20 at a time due to API limits:
        var i = 0;
        var j = 0;
        var promises = [];
        var chunk = 20;
        for (i = 0, j = namesArr.length; i < j; i += chunk) {
          promises.push(_this2._getCoordsForArray(namesArr.slice(i, i + chunk)));
        }

        Promise.all(promises).then(function (results) {
          // normalize
          var mergedResults = results.reduce(function (accumulator, currentValue) {
            return Object.assign(accumulator, currentValue.query.pages);
          }, {});
          resolve(mergedResults);
        });
      });
    },
    _getCoordsForArray: function _getCoordsForArray(namesArr) {
      var req = {
        url: 'https://cors-anywhere.herokuapp.com/en.wikipedia.org/w/api.php',

        content: {
          'action': 'query',
          'prop': 'info|coordinates|extracts',
          'titles': namesArr.join('|'),
          'colimit': '20',
          'coprop': 'type|name|dim|country|region|globe',
          'format': 'json',
          'inprop': 'url',
          'exintro': '1',
          'exsentences': '3'
        },
        'withCredentials': false
      };
      return esriRequest(req);
    },
    mapLocations: function mapLocations(locations) {
      var atLeastOneLocationPoint = false;
      for (var prop in locations) {
        if (locations[prop].hasOwnProperty('coordinates')) {
          atLeastOneLocationPoint = true;
          var pt = new Point(locations[prop].coordinates[0].lon, locations[prop].coordinates[0].lat);
          this.addGraphic(pt, locations[prop].title, locations[prop].fullurl, locations[prop].extract);
        }
      }
      if (atLeastOneLocationPoint) {
        this.setResultText(this.getGraphicsLayer().graphics.length + ' locations(s) found');
      } else {
        this.setResultText('No locations found.');
      }
    },
    setResultText: function setResultText(resultText) {
      html.set(this.resultsArea, resultText);
    },
    addGraphic: function addGraphic(geom, title, url, extract) {
      var _this3 = this;

      var gl = this.getGraphicsLayer();
      var symbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 20, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([255, 0, 0]), 1), new Color([0, 255, 0, 0.25]));

      // shorten the extract to ~500 characters
      var short = '';
      if (extract) {
        short = extract;
      } else {
        console.log('no extract?');
      }

      var template = new InfoTemplate({
        title: '${name}'
      });

      template.setContent(function (info) {
        var retString = '';
        if (short && short !== '') {
          retString = '' + retString + short + '<br /><br />';
        }
        return retString + '<a href="' + url + '" target="_blank">' + _this3.nls.viewOnWikipedia + '</a>';
      });

      gl.add(new Graphic(geom, symbol, {
        name: title
      }, template));
    },
    getGraphicsLayer: function getGraphicsLayer() {
      if (!this.locationsLayer) {
        this.locationsLayer = new GraphicsLayer();
        this.map.addLayer(this.locationsLayer);
      }
      return this.locationsLayer;
    },
    clearGraphicsLayer: function clearGraphicsLayer() {
      this.getGraphicsLayer().clear();
    },
    zoomToCurrentGraphics: function zoomToCurrentGraphics() {
      var extent = graphicsUtils.graphicsExtent(this.getGraphicsLayer().graphics);
      if (extent) {
        this.map.setExtent(extent, true);
      } else {
        this.map.centerAndZoom(this.getGraphicsLayer().graphics[0].geometry, 5);
      }
    },
    resetWidget: function resetWidget() {
      this.clearGraphicsLayer();
      this.queryText.set('value', '');
      this.setResultText('');
    },
    onOpen: function onOpen() {
      focusUtil.focus(this.queryText);
    },
    onClose: function onClose() {
      this.resetWidget();
    }
  });
});
//# sourceMappingURL=Widget.js.map
