/* globals Promise:true */
import $ from 'jquery';
import _ from 'lodash';

export const SET_ZOOMLEVEL = 'SET_ZOOMLEVEL';
export const SET_REGION = 'SET_REGION';
export const SET_INDICATOR = 'SET_INDICATOR';

export const REQUEST_PIS = 'REQUEST_PIS';
export const RECEIVE_PIS = 'RECEIVE_PIS';

export const REQUEST_REGIONS = 'REQUEST_REGIONS';
export const RECEIVE_REGIONS = 'RECEIVE_REGIONS';

function requestPis() {
  return {
    type: REQUEST_PIS,
  };
}

function receivePis(pidata, zoomlevels) {
  return {
    type: RECEIVE_PIS,
    piData: pidata,
    zoomlevels,
    receivedAt: Date.now(),
  };
}

function fetchPis() {
  return dispatch => {
    dispatch(requestPis());
    const piEndpoint = $.ajax({
      type: 'GET',
      url: 'https://nxt.staging.lizard.net/api/v2/pi/',
      xhrFields: {
        withCredentials: true,
      },
      success: (data) => {
        return data;
      },
    });

    Promise.all([piEndpoint]).then(([piResults]) => {
      // Now, get the details for every PI object
      const piUrls = piResults.results.map((pi) => {
        return $.ajax({
          type: 'GET',
          url: `${pi.url}`,
          xhrFields: {
            withCredentials: true,
          },
        });
      });
      Promise.all(piUrls).then((details) => {

        // Combine the pi detail with the pi parent
        const merged = _.zip(piResults.results, details);
        const zoomlevels = _.uniq(piResults.results.map((piresult) => {
          return piresult.boundary_type_name;
        }));
        // console.log('Done fetching indicators...');
        return dispatch(receivePis(merged, zoomlevels));
      });
    });
  };
}

export function fetchPisIfNeeded() {
  return (dispatch) => {
    return dispatch(fetchPis());
  };
}

function requestRegions() {
  return {
    type: REQUEST_REGIONS,
  };
}

function receiveRegions(regions) {
  // console.log('regions', regions);
  return {
    type: RECEIVE_REGIONS,
    regions,
    receivedAt: Date.now(),
  };
}

export function fetchRegions(type) {

  const zoomlevelmapping = {
    'DISTRICT': 9,
    'MUNICIPALITY': 3,
    'PROVINCE': 1,
    'CADASTRE': 11,
  };

  return dispatch => {
    dispatch(requestRegions());
    const regionEndpoint = $.ajax({
      type: 'GET',
      /* eslint-disable */
      url: `https://nxt.staging.lizard.net/api/v2/regions/?type=${zoomlevelmapping[type] || 9}&within_portal_bounds=true&format=json`,
      xhrFields: {
        withCredentials: true
      },
      /* eslint-enable */
      success: (data) => {
        return data;
      },
    });
    Promise.all([regionEndpoint]).then(([regionResults]) => {
      return dispatch(receiveRegions(regionResults));
    });
  };
}

export function fetchRegionsifNeeded() {
  return (dispatch) => {
    return dispatch(fetchRegions());
  };
}

export function setZoomLevel(zoomlevel) {
  return {
    type: SET_ZOOMLEVEL,
    zoomlevel,
  };
}

export function setRegion(region) {
  return {
    type: SET_REGION,
    region,
  };
}

export function setIndicator(indicator) {
  return {
    type: SET_INDICATOR,
    indicator,
  };
}
