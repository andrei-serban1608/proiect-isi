import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  Output,
  EventEmitter,
  OnDestroy
} from "@angular/core";

import esri = __esri; // Esri TypeScript Types

import Config from '@arcgis/core/config';
import WebMap from '@arcgis/core/WebMap';
import MapView from '@arcgis/core/views/MapView';
import Bookmarks from '@arcgis/core/widgets/Bookmarks';
import Expand from '@arcgis/core/widgets/Expand';

import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Graphic from '@arcgis/core/Graphic';
import Point from '@arcgis/core/geometry/Point';
import Polyline from '@arcgis/core/geometry/Polyline';
import Polygon from '@arcgis/core/geometry/Polygon';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';

import * as locator from '@arcgis/core/rest/locator';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils'

import FeatureLayer from '@arcgis/core/layers/FeatureLayer';

import FeatureSet from '@arcgis/core/rest/support/FeatureSet';
import RouteParameters from '@arcgis/core/rest/support/RouteParameters';
import * as route from "@arcgis/core/rest/route.js";

import { AngularFireDatabase } from '@angular/fire/compat/database';

@Component({
  selector: "app-esri-map",
  templateUrl: "./esri-map.component.html",
  styleUrls: ["./esri-map.component.scss"]
})
export class EsriMapComponent implements OnInit, OnDestroy {
  @Output() mapLoadedEvent = new EventEmitter<boolean>();

  @ViewChild("mapViewNode", { static: true }) private mapViewEl: ElementRef;

  map: esri.Map;
  view: esri.MapView;
  graphicsLayer: esri.GraphicsLayer;
  graphicsLayerUserPoints: esri.GraphicsLayer;
  graphicsLayerRoutes: esri.GraphicsLayer;
  trailheadsLayer: esri.FeatureLayer;

  zoom = 10;
  center: Array<number> = [26.1025, 44.4268];
  basemap = "streets-vector";
  loaded = false;
  directionsElement: any;

  constructor(private db: AngularFireDatabase) { }

  ngOnInit() {
    this.initializeMap().then(() => {
      this.loaded = this.view.ready;
      this.mapLoadedEvent.emit(true);
    });
    this.loadPointsFromFirebase();
    this.updateUserPosition();
  }

  async initializeMap() {
    try {
      Config.apiKey = "AAPTxy8BH1VEsoebNVZXo8HurCrw7hSm6MioqqR5pf9kvI_ShHlc_kptDa3OpeU94LXlC42WGMfWk-sJ4X5CGtr-PWsYQSohimOv-eGS-fzWynxbpv_c76QWnxGCvDH6Sxetk9-GSgIDx3g4S0XbTF4P9CrKmGUf_X7PGf8Eq_hovPFEwJMIInejkRzDkDKKDE9JMoA1AVYRn4fYRlYR5bBelvtfcUrWZHDNxKRQ1Zw8-s8.AT1_fUHnmBgT";

      const mapProperties: esri.WebMapProperties = {
        basemap: this.basemap
      };
      this.map = new WebMap(mapProperties);

      this.addFeatureLayers();
      this.addGraphicsLayer();

      const mapViewProperties = {
        container: this.mapViewEl.nativeElement,
        center: this.center,
        zoom: this.zoom,
        map: this.map
      };
      this.view = new MapView(mapViewProperties);

      this.view.on('click', (event: any) => {
        console.log(event);
        const point = this.view.toMap(event);
        this.addPointToMap(point.latitude, point.longitude);
        this.savePointToFirebase(point.latitude, point.longitude);
      });

      this.view.on('resize', () => {
        this.loadPointsFromFirebase();
      })

      this.view.on('pointer-move', ["Shift"], (event) => {
        const point = this.view.toMap({ x: event.x, y: event.y });
        console.log("Map pointer moved: ", point.longitude, point.latitude);
      });

      await this.view.when();
      console.log("ArcGIS map loaded");
      this.addRouting();

      this.task2();
      this.task3();

      return this.view;
    } catch (error) {
      console.error("Error loading the map: ", error);
      alert("Error loading the map");
    }
  }

  task2 () {
    const graphicsLayer = new GraphicsLayer();
    this.map.add(graphicsLayer);
    const point = new Point({ //Create a point
      longitude: -118.80657463861,
      latitude: 34.0005930608889
   });
   const simpleMarkerSymbol = {
      type: "simple-marker",
      color: [226, 119, 40],  // Orange
      outline: {
          color: [255, 255, 255], // White
          width: 1
      }
   };
   
   const pointGraphic = new Graphic({
      geometry: point,
      symbol: simpleMarkerSymbol
   });
   graphicsLayer.add(pointGraphic);

  // Create a line geometry
  const polyline = new Polyline ({
    paths: [[
        [-118.821527826096, 34.0139576938577], //Longitude, latitude
        [-118.814893761649, 34.0080602407843], //Longitude, latitude
        [-118.808878330345, 34.0016642996246]  //Longitude, latitude
    ]]
  });
  
  const simpleLineSymbol = {
    type: "simple-line",
    color: [226, 119, 40], // Orange
    width: 2
  };

  const polylineGraphic = new Graphic({
    geometry: polyline,
    symbol: simpleLineSymbol
  });
  graphicsLayer.add(polylineGraphic);

  // Create a polygon geometry
  const polygon = new Polygon ({
    rings: [[
        [-118.818984489994, 34.0137559967283], //Longitude, latitude
        [-118.806796597377, 34.0215816298725], //Longitude, latitude
        [-118.791432890735, 34.0163883241613], //Longitude, latitude
        [-118.79596686535, 34.008564864635],   //Longitude, latitude
        [-118.808558110679, 34.0035027131376]  //Longitude, latitude
    ]]
  });

  const simpleFillSymbol = {
    type: "simple-fill",
    color: [227, 139, 79, 0.8],  // Orange, opacity 80%
    outline: {
        color: [255, 255, 255],
        width: 1
    }
  };

  const popupTemplate = {
    title: "{Name}",
    content: "{Description}"
  }
  const attributes = {
    Name: "Graphic",
    Description: "I am a polygon"
  }

  const polygonGraphic = new Graphic({
    geometry: polygon,
    symbol: simpleFillSymbol,

    attributes: attributes,
    popupTemplate: popupTemplate

  });
  graphicsLayer.add(polygonGraphic);
  }

  findPlaces(category, pt) {
    
    const locatorUrl = "https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer";

    locator
      .addressToLocations(locatorUrl, {
        location: pt,
        categories: [category],
        maxLocations: 25,
        outFields: ["Place_addr", "PlaceName"],
        address: undefined
      })
      .then((results) => {
        this.view.closePopup();
        this.view.graphics.removeAll();

        results.forEach((result) => {
          this.view.graphics.add(
            new Graphic({
              attributes: result.attributes, // Data attributes returned
              geometry: result.location, // Point returned
              symbol: {
                color: "#0000FF",
              },

              popupTemplate: {
                title: "{PlaceName}", // Data attribute names
                content: "{Place_addr}"
              }
            })
          );
        });
      });
  }

  task3() {
    const places = ["Choose a place type...", "Parks and Outdoors", "Coffee shop", "Gas station", "Food", "Hotel"];

    const select = document.createElement("select");
    select.setAttribute("class", "esri-widget esri-select");
    select.setAttribute("style", "width: 175px; font-family: 'Avenir Next W00'; font-size: 1em");

    places.forEach((p) => {
      const option = document.createElement("option");
      option.value = p;
      option.innerHTML = p;
      select.appendChild(option);
    });

    this.view.ui.add(select, "top-right");

    const locatorUrl = "http://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer";

    // Search for places in center of map
    reactiveUtils.when(
      () => this.view.stationary,
      () => {
        this.findPlaces(select.value, this.view.center);
      }
    );

    // Listen for category changes and find places
    select.addEventListener("change", (event) => {
      this.findPlaces((event.target as HTMLSelectElement).value, this.view.center);
    });
  }

  addPointToMap(lat: number, lng: number): void {
    const point = new Point({
      longitude: lng,
      latitude: lat
    });

    const pointGraphic = new Graphic({
      geometry: point,
      symbol: new SimpleMarkerSymbol({
        color: [255, 0, 0],
        size: 8,
        outline: {
          color: [255, 255, 255],
          width: 2
        }
      })
    });

    this.view.graphics.add(pointGraphic);
  }

  savePointToFirebase(lat: number, lng: number): void {
    const pointsRef = this.db.list('points');
    pointsRef.push({latitude: lat, longitude: lng});
  }

  loadPointsFromFirebase(): void {
    const pointsRef = this.db.list('points');
    pointsRef.valueChanges().subscribe(points => {
      this.graphicsLayer.removeAll();
      points.forEach((point: any) => {
        this.addPointToMap(point.latitude, point.longitude);
      })
    })
  }

  saveUserPositionToFirebase(lat: number, lng: number): void {
    const userPositionRef = this.db.object('user_position');
    userPositionRef.set({latitude: lat, longitude: lng});
  }

  updateUserPosition(): void {
    this.saveUserPositionToFirebase(this.view.center.latitude, this.view.center.longitude);
    this.view.watch("center", () => {
      this.saveUserPositionToFirebase(this.view.center.latitude, this.view.center.longitude);
    });
  }

  addFeatureLayers() {
    this.trailheadsLayer = new FeatureLayer({
      url: "https://services3.arcgis.com/GVgbJbqm8hXASVYi/arcgis/rest/services/Trailheads/FeatureServer/0",
      outFields: ['*']
    });
    this.map.add(this.trailheadsLayer);

    const trailsLayer = new FeatureLayer({
      url: "https://services3.arcgis.com/GVgbJbqm8hXASVYi/arcgis/rest/services/Trails/FeatureServer/0"
    });
    this.map.add(trailsLayer, 0);

    const parksLayer = new FeatureLayer({
      url: "https://services3.arcgis.com/GVgbJbqm8hXASVYi/arcgis/rest/services/Parks_and_Open_Space/FeatureServer/0"
    });
    this.map.add(parksLayer, 0);

    console.log("Feature layers added");
  }

  addGraphicsLayer() {
    this.graphicsLayer = new GraphicsLayer();
    this.map.add(this.graphicsLayer);
    this.graphicsLayerUserPoints = new GraphicsLayer();
    this.map.add(this.graphicsLayerUserPoints);
    this.graphicsLayerRoutes = new GraphicsLayer();
    this.map.add(this.graphicsLayerRoutes);
  }

  addRouting() {
    const routeUrl = "https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World";
    this.view.on("click", (event) => {
      this.view.hitTest(event).then((elem: esri.HitTestResult) => {
        if (elem && elem.results && elem.results.length > 0) {
          let point: esri.Point = elem.results.find(e => e.layer === this.trailheadsLayer)?.mapPoint;
          if (point) {
            console.log("get selected point: ", elem, point);
            if (this.graphicsLayerUserPoints.graphics.length === 0) {
              this.addPoint(point.latitude, point.longitude);
            } else if (this.graphicsLayerUserPoints.graphics.length === 1) {
              this.addPoint(point.latitude, point.longitude);
              this.calculateRoute(routeUrl);
            } else {
              this.removePoints();
            }
          }
        }
      });
    });
  }

  addPoint(lat: number, lng: number) {
    let point = new Point({
      longitude: lng,
      latitude: lat
    });

    const simpleMarkerSymbol = {
      type: "simple-marker",
      color: [226, 119, 40],  // Orange
      outline: {
        color: [255, 255, 255], // White
        width: 1
      }
    };

    let pointGraphic: esri.Graphic = new Graphic({
      geometry: point,
      symbol: simpleMarkerSymbol
    });

    this.graphicsLayerUserPoints.add(pointGraphic);
  }

  removePoints() {
    this.graphicsLayerUserPoints.removeAll();
  }

  removeRoutes() {
    this.graphicsLayerRoutes.removeAll();
  }

  async calculateRoute(routeUrl: string) {
    const routeParams = new RouteParameters({
      stops: new FeatureSet({
        features: this.graphicsLayerUserPoints.graphics.toArray()
      }),
      returnDirections: true
    });

    try {
      const data = await route.solve(routeUrl, routeParams);
      this.displayRoute(data);
    } catch (error) {
      console.error("Error calculating route: ", error);
      alert("Error calculating route");
    }
  }

  displayRoute(data: any) {
    for (const result of data.routeResults) {
      result.route.symbol = {
        type: "simple-line",
        color: [5, 150, 255],
        width: 3
      };
      this.graphicsLayerRoutes.graphics.add(result.route);
    }
    if (data.routeResults.length > 0) {
      this.showDirections(data.routeResults[0].directions.features);
    } else {
      alert("No directions found");
    }
  }

  clearRouter() {
    if (this.view) {
      // Remove all graphics related to routes
      this.removeRoutes();
      this.removePoints();
      console.log("Route cleared");
      this.view.ui.remove(this.directionsElement);
      this.view.ui.empty("top-right");
      console.log("Directions cleared");
    }
  }

  showDirections(features: any[]) {
    this.directionsElement = document.createElement("ol");
    this.directionsElement.classList.add("esri-widget", "esri-widget--panel", "esri-directions__scroller");
    this.directionsElement.style.marginTop = "0";
    this.directionsElement.style.padding = "15px 15px 15px 30px";

    features.forEach((result, i) => {
      const direction = document.createElement("li");
      direction.innerHTML = `${result.attributes.text} (${result.attributes.length} miles)`;
      this.directionsElement.appendChild(direction);
    });

    this.view.ui.empty("top-right");
    this.view.ui.add(this.directionsElement, "top-right");
  }

  ngOnDestroy() {
    if (this.view) {
      this.view.container = null;
    }
  }
}
