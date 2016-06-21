import styles from './PiMap.css';
import React, { Component, PropTypes } from 'react';
import d3 from 'd3';
import _ from 'lodash';
import $ from 'jquery';
import Choropleth from 'react-leaflet-choropleth';
import { Map, TileLayer, Marker, Popup } from 'react-leaflet';

document.onmousemove = function(e){
    let infobox = $('.choro-popover')[0];
    // console.log(infobox);
    if(infobox) {
      $(infobox).css({top: e.pageY+15, left: e.pageX+15, position:'absolute'});;
    }
}

const style = {
  fillColor: '#000',
  weight: 2,
  opacity: 1,
  color: 'white',
  dashArray: '5',
  fillOpacity: 0.5,
};

const styleSelected = {
  fillColor: '#fff',
  weight: 8,
  opacity: 1,
  color: 'white',
  dashArray: '0',
  fillOpacity: 0.5,
};

class Pimap extends Component {

  constructor(props) {
    super(props);
    this.state = {
      width: window.innerWidth,
      height: window.innerHeight,
      hovering: false,
      hoverContent: '',
    };
    this.redraw = this.redraw.bind(this);
    this.onFeatureClick = this.onFeatureClick.bind(this);
    this.onFeatureHover = this.onFeatureHover.bind(this);
    this.onFeatureHoverOut = this.onFeatureHoverOut.bind(this);
  }

  componentDidMount() {
    window.addEventListener('resize', this.redraw);
  }

  // shouldComponentUpdate(nextProps) {
  //   return !_.isEqual(this.props, nextProps);
  // }

  componentWillUnmount() {
    window.removeEventListener('resize', this.redraw);
  }

  redraw() {
    this.setState({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }

  calculateScaleCenter(features) {
    // Get the bounding box of the paths (in pixels!) and calculate a
    // scale factor based on the size of the bounding box and the map
    // size.
    const bboxPath = d3.geo.bounds(features);
    const scale = 25 / Math.max(
        (bboxPath[1][0] - bboxPath[0][0]) / this.state.width,
        (bboxPath[1][1] - bboxPath[0][1]) / this.state.height
    );

    // Get the bounding box of the features (in map units!) and use it
    // to calculate the center of the features.
    const bboxFeature = d3.geo.bounds(features);
    const center = [
      (bboxFeature[1][0] + bboxFeature[0][0]) / 2,
      (bboxFeature[1][1] + bboxFeature[0][1]) / 2,
    ];

    return {
      scale,
      center,
    };
  }

  onFeatureClick(feature) {
    this.props.selectRegion(feature.layer.feature);
  }

  onFeatureHover(feature) {
    this.setState({
      hovering: true,
      hoverContent: feature.layer.feature,
    });
    console.log('-->', feature.layer.feature);
  }

  onFeatureHoverOut() {
    console.log('--> hovering out...');
    this.setState({
      hovering: false
    });
  }

  render() {

    const indicatorsSecondArrayValue = this.props.indicators.filter((indicator, i) => {
      if (this.props.indicator && indicator[1].boundary_type_name === this.props.selectedZoomLevel && indicator[0].name === this.props.indicator.name) {
        return indicator[1];
      }
    });

    const mapColorConfig = indicatorsSecondArrayValue.map((ind) => {
      return ind[1].regions.map((region) => {
        return {
          'reference_value': ind[0].reference_value,
          'region_name': region.region_name,
          'last_score': region.aggregations[region.aggregations.length - 1].score,
          'last_value': region.aggregations[region.aggregations.length - 1].value,
        };
      });
    });

    var self = this;
    const zoomlevelmapping = {
      'DISTRICT': 12,
      'MUNICIPALITY': 10,
    };

    let initialLocation = {
      lat: 52.3741,
      lng: 5.2032,
      zoom: zoomlevelmapping[this.props.selectedZoomLevel],
    };

    let choro = <div/>;
    if (this.props.data.results) {

      // +/- 0.05 correction for almeres weird geometry
      initialLocation.lat = this.calculateScaleCenter(this.props.data.results).center[1] - 0.05;
      initialLocation.lng = this.calculateScaleCenter(this.props.data.results).center[0] + 0.05;

      let results = this.props.data.results;
      results = results.features.filter(function(r) { if(r.properties.name) return r });

      choro = <Choropleth
        data={results}
        valueProperty={(feature) => {
          for (let key in mapColorConfig[0]) {
            // console.log('---->', mapColorConfig[0][key]);
            if (mapColorConfig[0][key].region_name === feature.properties.name) {
              if (mapColorConfig[0][key].last_value > mapColorConfig[0][key].reference_value) {
                return mapColorConfig[0][key].last_value;
              }
              else {
                return mapColorConfig[0][key].reference_value;
              }
            }
          }
        }}
        visible={(feature) => {
          return true;
        }}
        scale={['green', 'red']}
        steps={7}
        mode='e'
        style={(feature) => {
          try {
            return (feature.id === this.props.selectedRegion.id) ? styleSelected : style;
          } catch(e) {
            return style;
          }
        }}
        onClick={this.onFeatureClick.bind(self)}
        onMouseOver={this.onFeatureHover.bind(self)}
        onMouseOut={this.onFeatureHoverOut.bind(self)}
      />;
    }

    const position = [initialLocation.lat, initialLocation.lng];

    const hover = (this.state.hovering) ?
    <div
      className="choro-popover"
      style={{
        backgroundColor: '#353535',
        padding: 20,
        opacity: 0.9,
        position: 'absolute',
        zIndex: 999999,
      }}>{this.state.hoverContent.properties.name}</div> :
    <div/>;

    return (
      <Map center={position}
           zoomControl={false}
           zoom={initialLocation.zoom}
           style={{ position: 'absolute',
                    top: 0,
                    left: 0,
                    width: this.state.width,
                    height: this.state.height,
                  }}>
        <TileLayer
          attribution='&copy; <a href="http://mapbox.com/">MapBox</a> &copy; <a href="http://www.nelen-schuurmans.nl/">Nelen &amp; Schuurmans</a>'
          url='https://{s}.tiles.mapbox.com/v3/nelenschuurmans.l15e647c/{z}/{x}/{y}.png'
        />
        {choro}
        {hover}
      </Map>
    );
  }
}

Pimap.propTypes = {
  data: PropTypes.any,
  selectRegion: PropTypes.func,
  selectedRegion: PropTypes.any,
};

export default Pimap;

// class Map extends Component {
//   constructor(props) {
//     super(props);
//     this.state = {
//       width: window.innerWidth,
//       height: window.innerHeight,
//     };
//     this.redraw = this.redraw.bind(this);
//     this._handleRegionClick = this._handleRegionClick.bind(this);
//   }
//
//   componentDidMount() {
//     window.addEventListener('resize', this.redraw);
//   }
//
//   shouldComponentUpdate(nextProps) {
//     return !_.isEqual(this.props, nextProps);
//   }
//
//   componentWillUnmount() {
//     window.removeEventListener('resize', this.redraw);
//   }
//
//   calculateScaleCenter(features) {
//     // Get the bounding box of the paths (in pixels!) and calculate a
//     // scale factor based on the size of the bounding box and the map
//     // size.
//     const bboxPath = d3.geo.bounds(features);
//     const scale = 25 / Math.max(
//         (bboxPath[1][0] - bboxPath[0][0]) / this.state.width,
//         (bboxPath[1][1] - bboxPath[0][1]) / this.state.height
//     );
//
//     // Get the bounding box of the features (in map units!) and use it
//     // to calculate the center of the features.
//     const bboxFeature = d3.geo.bounds(features);
//     const center = [
//       (bboxFeature[1][0] + bboxFeature[0][0]) / 2,
//       (bboxFeature[1][1] + bboxFeature[0][1]) / 2];
//
//     return {
//       scale,
//       center,
//     };
//   }
//
//   _handleRegionClick(region) {
//     this.props.selectRegion(region);
//   }
//
//   redraw() {
//     this.setState({
//       width: window.innerWidth,
//       height: window.innerHeight,
//     });
//   }
//
//   quantize = d3.scale.quantize()
//     .domain([0, 0.15])
//     .range(d3.range(9).map((i) => {
//       return `q${i}-9`;
//     }))
//
//   render() {
//
//     console.log(this.props);
//
//     if (this.props.data.length < 1) {
//       return <div/>;
//     }
//
//     const scaleCenter = this.calculateScaleCenter(this.props.data.results);
//     const projection = d3.geo.mercator()
//       .scale(scaleCenter.scale)
//       .center(scaleCenter.center)
//       .translate([
//         this.state.width / 2,
//         this.state.height / 2,
//       ]);
//
//     const pathGenerator = d3.geo.path().projection(projection);
//
//     let paths = this.props.data.results.features.map((buurt, i) => {
//       const selectedColor = (
//         this.props.selectedRegion &&
//         this.props.selectedRegion.id &&
//         buurt.id === this.props.selectedRegion.id) ?
//         'red' : 'white';
//       const strokeSize = (
//         this.props.selectedRegion &&
//         this.props.selectedRegion.id &&
//         buurt.id === this.props.selectedRegion.id) ?
//         4 : 1;
//       const colorClass = `${this.quantize(Math.random(0.15))}`;
//       return <path
//               stroke={selectedColor}
//               strokeWidth={strokeSize}
//               onClick={() => this._handleRegionClick(buurt)}
//               d={pathGenerator(buurt.geometry)}
//               className={styles[colorClass]}
//               style={{ cursor: 'pointer' }}
//               key={i}>
//             </path>;
//     });
//
//     let labels = this.props.data.results.features.map((label, i) => {
//       const latlng = d3.geo.centroid(label);
//       return <div
//                 key={i}
//                 fill="white"
//                 onClick={() => this._handleRegionClick(label)}
//                 style={{
//                   transform: `translate(${projection(latlng)[0]}px, ${projection(latlng)[1]}px)`,
//                   position: 'absolute',
//                   cursor: 'pointer',
//                 }}
//                 className={styles.label}>
//                 <p><i className="fa fa-circle"></i>&nbsp;&nbsp;{label.properties.name || 'Onbekend'}</p>
//               </div>;
//     });
//
//     return (
//       <div ref='map' className={styles.Map} id='map'>
//         {labels}
//         <svg width={this.state.width} height={this.state.height}>
//           <g className={styles.outline}>
//             {paths}
//           </g>
//         </svg>
//       </div>
//     );
//   }
// }
//
// Map.propTypes = {
//   data: PropTypes.any,
//   selectRegion: PropTypes.func,
//   selectedRegion: PropTypes.any,
// };
//
