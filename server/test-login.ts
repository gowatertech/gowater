import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

// Función para probar el login sin usar Express
export async function testLogin(username: string, password: string) {
  try {
    console.log(`Probando login con: ${username}`);
    
    // Buscar el usuario por nombre de usuario
    const [user] = await db.select().from(users).where(eq(users.username, username));
    
    if (!user) {
      console.log(`Usuario no encontrado: ${username}`);
      return { success: false, message: "Usuario no encontrado" };
    }
    
    // Verificar contraseña con bcrypt
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.log(`Contraseña inválida para usuario: ${username}`);
      return { success: false, message: "Contraseña inválida" };
    }
    
    if (!user.active) {
      console.log(`Usuario inactivo: ${username}`);
      return { success: false, message: "Usuario inactivo" };
    }
    
    // Verificar roles permitidos para la app móvil
    const allowedRoles = ['driver', 'assistant', 'admin', 'supervisor'];
    if (!allowedRoles.includes(user.role)) {
      console.log(`Rol no permitido: ${user.role} para usuario: ${username}`);
      return { 
        success: false, 
        message: "Este usuario no tiene permiso para acceder a la app móvil" 
      };
    }
    
    // Si llegamos aquí, el login fue exitoso
    console.log(`Login exitoso para usuario ${username} (ID: ${user.id}, Empresa: ${user.companyId})`);
    
    // No devolver la contraseña en la respuesta
    const { password: pwd, ...userWithoutPassword } = user;
    
    return {
      success: true,
      message: "Login exitoso",
      user: userWithoutPassword
    };
  } catch (error) {
    console.error("Error en test login:", error);
    return { 
      success: false, 
      message: "Error de servidor al procesar el login",
      error: String(error)
    };
  }
}

export async function runTestLogin() {
  // Probamos con un usuario de prueba
  const result = await testLogin('driver', 'password123');
  console.log("Resultado de prueba de login:", result);
}

// Ejecutar la prueba inmediatamente
runTestLogin()
  .then(() => console.log("Prueba completada"))
  .catch(err => console.error("Error en prueba:", err));