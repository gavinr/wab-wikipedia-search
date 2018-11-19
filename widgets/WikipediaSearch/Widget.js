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

  formSubmit(evt) {
    evt.preventDefault();
    evt.stopPropagation();

    this.clearGraphicsLayer();
    this.wikipediaSearch(this.queryText.get('value')).then((searchResults) => {
      // get coords
      this.getCoordsForArray(searchResults[1]).then((locationResults) => {
        this.mapLocations(locationResults);
        this.zoomToCurrentGraphics();
      });
    });
  },

  wikipediaSearch(searchQuery) {
    var req = {
      url: 'https://en.wikipedia.org/w/api.php',
      content: {
        'action': 'opensearch',
        'search': searchQuery,
        'limit': '50',
        'namespace': '0',
        'format': 'json'
      }
    };
    return esriRequest(req);
  },

  getCoordsForArray(namesArr) {
    return new Promise((resolve, reject) => {
      // do 20 at a time due to API limits:
      let i = 0;
      let j = 0;
      let promises = [];
      let chunk = 20;
      for(i=0,j=namesArr.length; i<j; i+=chunk) {
        promises.push(this._getCoordsForArray(namesArr.slice(i, i+chunk)));
      }
      
      Promise.all(promises).then((results) => {
        // normalize
        const mergedResults = results.reduce((accumulator, currentValue) => {
          return Object.assign(accumulator, currentValue.query.pages);
        }, {});
        resolve(mergedResults);
      });
    });

    
  },

  _getCoordsForArray(namesArr) {
    var req = {
      url: 'https://en.wikipedia.org/w/api.php',
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
        this.addGraphic(pt, locations[prop].title, locations[prop].fullurl, locations[prop].extract);
      }
    }
    if (atLeastOneLocationPoint) {
      this.setResultText(this.getGraphicsLayer().graphics.length + ' locations(s) found');
    } else {
      this.setResultText('No locations found.');
    }
  },

  setResultText(resultText) {
    html.set(this.resultsArea, resultText);
  },

  addGraphic(geom, title, url, extract) {
    var gl = this.getGraphicsLayer();
    var symbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 20,
      new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
        new Color([255, 0, 0]), 1),
      new Color([0, 255, 0, 0.25]));

    // shorten the extract to ~500 characters
    let short = '';
    if(extract) {
      short = extract;
    } else {
      console.log('no extract?');
    }

    const template = new InfoTemplate({
      title: '${name}'
    });

    template.setContent(
      (info) => {
        let retString = ``;
        if(short && short !== '') {
          retString = `${retString}${short}<br /><br />`;
        }
        return `${retString}<a href="${url}" target="_blank">${this.nls.viewOnWikipedia}</a>`;
      }
    )

    gl.add(new Graphic(geom, symbol, {
      name: title
    }, template));
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