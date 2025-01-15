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

  constructor() { }

  ngOnInit() {
    this.initializeMap().then(() => {
      this.loaded = this.view.ready;
      this.mapLoadedEvent.emit(true);
    });
  }

  async initializeMap() {
    try {
      Config.apiKey = "AAPTxy8BH1VEsoebNVZXo8HurHI6HvJVn-5AEd_XQ0h6X2O1PepzZrBRoU0l2WeOTRQkE4bA3NsxYrwbuivfH2CkH3LVKmUX6tLt_3VLwGpzetMQp5LA7K5ktXYbK1EvUpDr4JXR5OqkcIB3iRbmA4u3behH1qVjt5qG8rt2pQHhXldd0R5ovjWyPs8rahX10Ex7-FD0KI3OF-nwJT16A-MD7zMlxWX6Pi6l3xWxE5O2V9c.AT1_La1csz7y";

      const mapProperties: esri.WebMapProperties = {
        basemap: this.basemap
      };
      this.map = new WebMap(mapProperties);

      const addresses = [];
      this.addFeatureLayers(addresses);
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
        //this.addPointToMap(point.latitude, point.longitude);
        //this.savePointToFirebase(point.latitude, point.longitude);
      });


      this.view.on('pointer-move', ["Shift"], (event) => {
        const point = this.view.toMap({ x: event.x, y: event.y });
        console.log("Map pointer moved: ", point.longitude, point.latitude);
      });

      await this.view.when();
      console.log("ArcGIS map loaded");
      this.addRouting();

      this.createGraphicsLayer();
      this.addGeolocationPin();

      return this.view;
    } catch (error) {
      console.error("Error loading the map: ", error);
      alert("Error loading the map");
    }
  }

  createGraphicsLayer () {
    const graphicsLayer = new GraphicsLayer();
    this.map.add(graphicsLayer);
  }

  addGeolocationPin(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
  
          console.log(`Geolocation: ${latitude}, ${longitude}`);
  
          // Add a pin at the user's location
          const userLocationPoint = new Point({
            longitude: longitude,
            latitude: latitude
          });
  
          const userLocationGraphic = new Graphic({
            geometry: userLocationPoint,
            symbol: new SimpleMarkerSymbol({
              color: [0, 0, 255], // Blue color
              size: 10,
              outline: {
                color: [255, 255, 255], // White outline
                width: 2
              }
            }),
            popupTemplate: {
              title: "Your Location",
              content: `Latitude: ${latitude}, Longitude: ${longitude}`
            }
          });
          const graphicsLayerGeolocation = new GraphicsLayer();
          graphicsLayerGeolocation.add(userLocationGraphic);
          this.map.add(graphicsLayerGeolocation);
        },
        (error) => {
          console.error("Geolocation error:", error);
          alert("Unable to retrieve your location. Please check your browser settings.");
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
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


  async addFeatureLayers(addresses: string[]) {
    const graphicsLayer = new GraphicsLayer();
    this.map.add(graphicsLayer);

    const geocodeUrl = "https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer";

    // Path to the CSV file in the assets folder
    const csvFilePath = 'assets/sector5.csv';

    try {
      // Fetch the CSV file content
      const response = await fetch(csvFilePath);
      if (!response.ok) {
        throw new Error(`Failed to load CSV file: ${response.statusText}`);
      }

      const csvText = await response.text();

      // Parse CSV text and split it into rows
      const rows = csvText.split('\n').map(row => row.trim()).filter(row => row);

      // Extract headers to get field positions
      const headers = rows[0].split(','); // Assuming CSV is comma-separated
      const denumireIndex = headers.indexOf("DENUMIRE");
      const adresaIndex = headers.indexOf("ADRESA");
      const localitateINDEX = headers.indexOf("LOCALITATE");
      const observatiiINDEX = headers.indexOf("OBSERVATII");
      const structuraINDEX = headers.indexOf("IN STRUCTURA");

      if (denumireIndex === -1 || adresaIndex === -1) {
        throw new Error("CSV must include 'DENUMIRE' and 'ADRESA' columns.");
      }

      // Process each row (skip the header row)
      for (let i = 1; i < rows.length; i++) {
        const fields = rows[i].split(',');
        if (fields.length <= Math.max(denumireIndex, adresaIndex)) continue;

        const denumire = fields[denumireIndex].trim();
        const adresa = fields[adresaIndex];
        const localitate = fields[localitateINDEX].trim();
        const structura = fields[structuraINDEX].trim();
        const observatii = fields[observatiiINDEX].trim();
        const fullAddress = `${denumire}, ${adresa}, ${localitate}`;

        try {
          const results = await locator.addressToLocations(geocodeUrl, {
            address: { SingleLine: fullAddress },
            maxLocations: 1,
            outFields: ["*"]
          });

          if (results.length > 0) {
            const location = results[0].location;

            const point = new Point({
              longitude: location.x,
              latitude: location.y
            });

            const pointGraphic = new Graphic({
              geometry: point,
              symbol: {
                color: [226, 119, 40] // Orange color
              },
              attributes: {
                Address: adresa,
                Location : denumire,
                Structure: structura,
                Observations: observatii
              },
              popupTemplate: {
                title: "{Location}",
                content: "Adresa: {Address}<br>In structura: {Structure} <br>Observatii: {Observations}"
              }
            });

            graphicsLayer.add(pointGraphic);
          }
        } catch (geocodeError) {
          console.error(`Failed to geocode address: ${fullAddress}`, geocodeError);
        }
      }
    } catch (error) {
      console.error("Error loading or processing CSV file:", error);
    }

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
  
    this.view.on("click", async (event) => {
      const clickedPoint = this.view.toMap(event); // Get the map coordinates of the click
      if (!clickedPoint) return;
  
      // Clear previous routes and points
      this.removeRoutes();
      this.removePoints();
  
      // Add the destination point
      this.addPoint(clickedPoint.latitude, clickedPoint.longitude);
  
      // Get user's current location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const userLatitude = position.coords.latitude;
            const userLongitude = position.coords.longitude;
  
            // Add user's location as a point
            this.addPoint(userLatitude, userLongitude);
  
            // Calculate the route
            await this.calculateRoute(routeUrl);
          },
          (error) => {
            console.error("Geolocation error:", error);
            alert("Unable to retrieve your location. Please check your browser settings.");
          }
        );
      } else {
        alert("Geolocation is not supported by this browser.");
      }
    });
  }

  addPoint(lat: number, lng: number) {
    const point = new Point({
      longitude: lng,
      latitude: lat
    });
  
    const simpleMarkerSymbol = {
      type: "simple-marker",
      color: [226, 119, 40],  // Orange for destination
      outline: {
        color: [255, 255, 255], // White
        width: 1
      }
    };
  
    const pointGraphic = new Graphic({
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
        features: this.graphicsLayerUserPoints.graphics.toArray() // Include the user and clicked point
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
        color: [5, 150, 255], // Blue route
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
