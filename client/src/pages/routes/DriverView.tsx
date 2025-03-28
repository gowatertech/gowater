import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import { Check, Navigation2, RefreshCcw, Printer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import type { DriverDelivery } from "@shared/schema";

/**
 * Esta es simplemente una redirección al componente real en /pages/drivers/DriverView
 */
import DriverViewComponent from "@/pages/drivers/DriverView";

export default function DriverView() {
  return <DriverViewComponent />;
}