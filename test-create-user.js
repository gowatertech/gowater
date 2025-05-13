import fetch from 'node-fetch';

// Datos de prueba para crear un usuario
const testUserData = {
  name: "Usuario Test",
  username: "usuariotest",
  password: "contraseña123",
  role: "admin",
  companyId: 1, // Suponiendo que 1 es un ID válido
  email: "test@example.com"
};

async function testCreateUser() {
  try {
    console.log('Intentando crear usuario con datos:', {
      ...testUserData,
      password: '[REDACTED]'
    });

    // Vamos a usar localhost directamente
    const response = await fetch('http://localhost:4000/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUserData),
    });

    // Verificar respuesta
    console.log('Código de estado:', response.status);
    const data = await response.json();
    console.log('Respuesta del servidor:', data);

    return { success: response.ok, data };
  } catch (error) {
    console.error('Error al ejecutar prueba:', error.message);
    return { success: false, error: error.message };
  }
}

// Ejecutar la prueba
testCreateUser().then(result => {
  console.log('Resultado final:', result.success ? 'Éxito' : 'Falló');
  if (!result.success) {
    console.error('Detalle del error:', result.error || result.data);
  }
});