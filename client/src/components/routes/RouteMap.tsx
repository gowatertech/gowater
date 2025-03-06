import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import type { Route } from "@shared/schema";
import 'leaflet/dist/leaflet.css';

interface RouteMapProps {
  route: Route;
  className?: string;
}

export default function RouteMap({ route, className }: RouteMapProps) {
  return (
    <div className={className}>
      <MapContainer
        center={[18.4955, -69.8734]} // Santo Domingo coordinates
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {route.stops?.map((stop, index) => (
          <Marker
            key={index}
            position={[
              parseFloat(stop.latitude.toString()),
              parseFloat(stop.longitude.toString())
            ]}
          >
            <Popup>
              Parada #{index + 1}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
