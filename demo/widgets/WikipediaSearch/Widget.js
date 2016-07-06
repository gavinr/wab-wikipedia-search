define(['dojo/_base/declare', 'jimu/BaseWidget', 'esri/request', 'esri/geometry/Point', 'esri/symbols/SimpleMarkerSymbol', 'esri/symbols/SimpleLineSymbol', 'esri/InfoTemplate', 'esri/graphic', 'esri/layers/GraphicsLayer', 'esri/graphicsUtils', 'dojo/_base/Color', 'dojo/html', 'dijit/focus', 'dijit/_WidgetsInTemplateMixin', 'dijit/form/TextBox', 'dojox/form/BusyButton'], function (declare, BaseWidget, esriRequest, Point, SimpleMarkerSymbol, SimpleLineSymbol, InfoTemplate, Graphic, GraphicsLayer, graphicsUtils, Color, html, focusUtil, _WidgetsInTemplateMixin, TextBox, BusyButton) {
  return declare([BaseWidget, _WidgetsInTemplateMixin], {

    baseClass: 'wikipedia-search',

    postCreate: function postCreate() {
      this.inherited(arguments);
      console.log('WikipediaSearch::postCreate');
    },
    searchButtonOnClick: function searchButtonOnClick() {
      var _this = this;

      this.clearGraphicsLayer();
      this.wikipediaSearch(this.queryText.get('value')).then(function (searchResults) {
        // get coords
        _this.getCoordsForArray(searchResults[1]).then(function (locationResults) {
          _this.mapLocations(locationResults.query.pages);
          _this.searchButton.cancel();
          _this.zoomToCurrentGraphics();
        });
      });
    },
    searchOnKeyUpHandler: function searchOnKeyUpHandler(evt) {
      if (evt.keyCode === 13) {
        this.searchButton.makeBusy();
        this.searchButtonOnClick();
      }
    },
    wikipediaSearch: function wikipediaSearch(searchQuery) {
      var req = {
        url: 'https://en.wikipedia.org/w/api.php',
        content: {
          'action': 'opensearch',
          'search': searchQuery,
          'limit': '20',
          'namespace': '0',
          'format': 'json'
        }
      };
      return esriRequest(req);
    },
    getCoordsForArray: function getCoordsForArray(namesArr) {
      var req = {
        url: 'https://en.wikipedia.org/w/api.php',
        content: {
          'action': 'query',
          'prop': 'coordinates',
          'titles': namesArr.join('|'),
          'colimit': '10',
          'coprop': 'type|name|dim|country|region|globe',
          'format': 'json'
        }
      };
      return esriRequest(req);
    },
    mapLocations: function mapLocations(locations) {
      var atLeastOneLocationPoint = false;
      for (var prop in locations) {
        if (locations[prop].hasOwnProperty('coordinates')) {
          atLeastOneLocationPoint = true;
          var pt = new Point(locations[prop].coordinates[0].lon, locations[prop].coordinates[0].lat);
          this.addGraphic(pt, locations[prop].title);
        }
      }
      if (atLeastOneLocationPoint) {
        this.setResultText(this.getGraphicsLayer().graphics.length + ' point(s) found');
      } else {
        this.setResultText('No locations found.');
      }
    },
    setResultText: function setResultText(resultText) {
      html.set(this.resultsArea, resultText);
    },
    addGraphic: function addGraphic(geom, title) {
      var gl = this.getGraphicsLayer();
      var symbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 20, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([255, 0, 0]), 1), new Color([0, 255, 0, 0.25]));
      gl.add(new Graphic(geom, symbol, {
        name: title
      }, new InfoTemplate('Attributes', '${*}')));
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
