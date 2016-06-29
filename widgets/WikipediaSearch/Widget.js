import declare from 'dojo/_base/declare';
import BaseWidget from 'jimu/BaseWidget';

import esriRequest from 'esri/request';
import Point from 'esri/geometry/Point';
import SimpleMarkerSymbol from 'esri/symbols/SimpleMarkerSymbol';
import SimpleLineSymbol from 'esri/symbols/SimpleLineSymbol';
import InfoTemplate from 'esri/InfoTemplate';
import Graphic from 'esri/graphic';
import GraphicsLayer from 'esri/layers/GraphicsLayer';
import graphicsUtils from 'esri/graphicsUtils';

import Color from 'dojo/_base/Color';
import html from 'dojo/html';

import focusUtil from 'dijit/focus';
import _WidgetsInTemplateMixin from 'dijit/_WidgetsInTemplateMixin';

import TextBox from 'dijit/form/TextBox';
import BusyButton from 'dojox/form/BusyButton';

export default declare([BaseWidget, _WidgetsInTemplateMixin], {

  baseClass: 'wikipedia-search',

  postCreate() {
    this.inherited(arguments);
    console.log('WikipediaSearch::postCreate');
  },

  searchButtonOnClick() {
    this.clearGraphicsLayer();
    this.wikipediaSearch(this.queryText.get('value')).then((searchResults) => {
      // get coords
      this.getCoordsForArray(searchResults[1]).then((locationResults) => {
        this.mapLocations(locationResults.query.pages);
        this.searchButton.cancel();
        this.zoomToCurrentGraphics();
      });
    });
  },

  searchOnKeyUpHandler(evt) {
    if (evt.keyCode === 13) {
      this.searchButton.makeBusy();
      this.searchButtonOnClick();
    }
  },

  wikipediaSearch(searchQuery) {
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

  getCoordsForArray(namesArr) {
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

  mapLocations(locations) {
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

  setResultText(resultText) {
    html.set(this.resultsArea, resultText);
  },

  addGraphic(geom, title) {
    var gl = this.getGraphicsLayer();
    var symbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 20,
      new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
        new Color([255, 0, 0]), 1),
      new Color([0, 255, 0, 0.25]));
    gl.add(new Graphic(geom, symbol, {
      name: title
    }, new InfoTemplate('Attributes', '${*}')));
  },

  getGraphicsLayer() {
    if (!this.locationsLayer) {
      this.locationsLayer = new GraphicsLayer();
      this.map.addLayer(this.locationsLayer);
    }
    return this.locationsLayer;
  },

  clearGraphicsLayer() {
    this.getGraphicsLayer().clear();
  },

  zoomToCurrentGraphics() {
    var extent = graphicsUtils.graphicsExtent(this.getGraphicsLayer().graphics);
    if (extent) {
      this.map.setExtent(extent, true);
    } else {
      this.map.centerAndZoom(this.getGraphicsLayer().graphics[0].geometry, 5);
    }
  },

  resetWidget() {
    this.clearGraphicsLayer();
    this.queryText.set('value', '');
    this.setResultText('');
  },

  onOpen() {
    focusUtil.focus(this.queryText);
  },

  onClose() {
    this.resetWidget();
  }
});
