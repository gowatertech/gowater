import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestDashboard() {
  const [loginResult, setLoginResult] = useState<any>("No se ha iniciado sesión aún.");
  const [statsResult, setStatsResult] = useState<any>("No se ha realizado la prueba.");
  const [paymentsResult, setPaymentsResult] = useState<any>("No se ha realizado la prueba.");
  const [routesResult, setRoutesResult] = useState<any>("No se ha realizado la prueba.");
  const [bottlesResult, setBottlesResult] = useState<any>("No se ha realizado la prueba.");
  
  const [loginSuccess, setLoginSuccess] = useState(false);
  
  const handleLogin = async () => {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          email: 'admin@gowater.com',
          password: 'admin123'
        })
      });
      
      const data = await response.json();
      setLoginResult(data);
      
      if (data.success) {
        setLoginSuccess(true);
      }
    } catch (error: any) {
      setLoginResult({ error: error.message });
    }
  };
  
  const testStats = async () => {
    try {
      console.log("Iniciando solicitud GET a /api/dashboard/stats");
      const response = await fetch('/api/dashboard/stats', {
        credentials: 'include'
      });
      
      const data = await response.json();
      console.log("Respuesta de /api/dashboard/stats:", data);
      setStatsResult(data);
    } catch (error: any) {
      setStatsResult({ error: error.message });
    }
  };
  
  const testPayments = async () => {
    try {
      console.log("Iniciando solicitud GET a /api/dashboard/payments-stats");
      const response = await fetch('/api/dashboard/payments-stats', {
        credentials: 'include'
      });
      
      const data = await response.json();
      console.log("Respuesta de /api/dashboard/payments-stats:", data);
      setPaymentsResult(data);
    } catch (error: any) {
      setPaymentsResult({ error: error.message });
    }
  };
  
  const testRoutes = async () => {
    try {
      console.log("Iniciando solicitud GET a /api/dashboard/route-stats");
      const response = await fetch('/api/dashboard/route-stats', {
        credentials: 'include'
      });
      
      const data = await response.json();
      console.log("Respuesta de /api/dashboard/route-stats:", data);
      setRoutesResult(data);
    } catch (error: any) {
      setRoutesResult({ error: error.message });
    }
  };
  
  const testBottles = async () => {
    try {
      console.log("Iniciando solicitud GET a /api/dashboard/bottle-stats");
      const response = await fetch('/api/dashboard/bottle-stats', {
        credentials: 'include'
      });
      
      const data = await response.json();
      console.log("Respuesta de /api/dashboard/bottle-stats:", data);
      setBottlesResult(data);
    } catch (error: any) {
      setBottlesResult({ error: error.message });
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Prueba de API del Dashboard</h1>
      <p className="text-gray-600">
        Esta página realiza llamadas a los endpoints del dashboard para probar si devuelven datos correctamente.
      </p>
      
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleLogin}>1. Iniciar sesión</Button>
        <Button onClick={testStats} disabled={!loginSuccess}>2. Probar /dashboard/stats</Button>
        <Button onClick={testPayments} disabled={!loginSuccess}>3. Probar /dashboard/payments-stats</Button>
        <Button onClick={testRoutes} disabled={!loginSuccess}>4. Probar /dashboard/route-stats</Button>
        <Button onClick={testBottles} disabled={!loginSuccess}>5. Probar /dashboard/bottle-stats</Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Resultado del inicio de sesión</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
            {JSON.stringify(loginResult, null, 2)}
          </pre>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Resultado de /dashboard/stats</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
            {JSON.stringify(statsResult, null, 2)}
          </pre>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Resultado de /dashboard/payments-stats</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
            {JSON.stringify(paymentsResult, null, 2)}
          </pre>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Resultado de /dashboard/route-stats</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
            {JSON.stringify(routesResult, null, 2)}
          </pre>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Resultado de /dashboard/bottle-stats</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
            {JSON.stringify(bottlesResult, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}