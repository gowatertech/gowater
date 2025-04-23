import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface SubdomainInfo {
  hostname: string;
  detectedSubdomain: string | null;
  session: {
    companyId: number | null;
    user: any | null;
  };
  allCompanies: {
    id: number;
    name: string;
    subdomain: string;
    active: boolean;
  }[];
}

export default function TestSubdomain() {
  const [subdomainInfo, setSubdomainInfo] = useState<SubdomainInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [testSubdomain, setTestSubdomain] = useState('');
  const { toast } = useToast();

  const fetchSubdomainInfo = async (subdomain?: string) => {
    setLoading(true);
    try {
      const url = subdomain 
        ? `/api/test-subdomain?subdomain=${subdomain}`
        : '/api/test-subdomain';
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Error al obtener información de subdominio');
      }
      
      const data = await response.json();
      setSubdomainInfo(data);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'No se pudo obtener la información del subdominio',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubdomainInfo();
  }, []);

  const handleTestSubdomain = () => {
    if (!testSubdomain) {
      toast({
        title: 'Error',
        description: 'Por favor ingrese un subdominio para probar',
        variant: 'destructive',
      });
      return;
    }
    fetchSubdomainInfo(testSubdomain);
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Prueba de Detección de Subdominio</h1>
      
      <div className="flex items-end gap-4 mb-6">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1" htmlFor="subdomain">
            Probar con subdominio:
          </label>
          <Input
            id="subdomain"
            placeholder="Ingrese un subdominio para simular"
            value={testSubdomain}
            onChange={(e) => setTestSubdomain(e.target.value)}
          />
        </div>
        <Button onClick={handleTestSubdomain} disabled={loading}>
          {loading ? 'Probando...' : 'Probar'}
        </Button>
      </div>
      
      {loading ? (
        <div className="text-center py-8">Cargando información...</div>
      ) : subdomainInfo ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Información de Detección</CardTitle>
              <CardDescription>
                Detalles sobre la detección de subdominio actual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <strong>Hostname:</strong> {subdomainInfo.hostname}
                </div>
                <div>
                  <strong>Subdominio detectado:</strong>{' '}
                  {subdomainInfo.detectedSubdomain || <em>Ninguno</em>}
                </div>
                <div>
                  <strong>Company ID en sesión:</strong>{' '}
                  {subdomainInfo.session.companyId || <em>Ninguno</em>}
                </div>
                <div>
                  <strong>Usuario en sesión:</strong>{' '}
                  {subdomainInfo.session.user ? (
                    <pre className="bg-slate-100 p-2 rounded mt-2 overflow-auto">
                      {JSON.stringify(subdomainInfo.session.user, null, 2)}
                    </pre>
                  ) : (
                    <em>No hay usuario en sesión</em>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Empresas Disponibles</CardTitle>
              <CardDescription>
                Listado de empresas registradas y sus subdominios
              </CardDescription>
            </CardHeader>
            <CardContent>
              {subdomainInfo.allCompanies.length === 0 ? (
                <p>No hay empresas registradas</p>
              ) : (
                <div className="space-y-4">
                  {subdomainInfo.allCompanies.map((company) => (
                    <div
                      key={company.id}
                      className={`p-3 rounded border ${
                        subdomainInfo.session.companyId === company.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="font-medium">{company.name}</div>
                      <div className="text-sm">
                        <strong>ID:</strong> {company.id}
                      </div>
                      <div className="text-sm">
                        <strong>Subdominio:</strong> {company.subdomain}
                      </div>
                      <div className="text-sm">
                        <strong>Estado:</strong>{' '}
                        {company.active ? (
                          <span className="text-green-600">Activo</span>
                        ) : (
                          <span className="text-red-600">Inactivo</span>
                        )}
                      </div>
                      <div className="mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchSubdomainInfo(company.subdomain)}
                        >
                          Probar este subdominio
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button variant="outline" onClick={() => fetchSubdomainInfo()}>
                Resetear
              </Button>
            </CardFooter>
          </Card>
        </div>
      ) : (
        <div className="text-center py-8">No se pudo cargar la información del subdominio</div>
      )}
    </div>
  );
}