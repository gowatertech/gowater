const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Casos a procesar
const casos = [
  // Anticipos que cubren completamente la factura con sobrante
  { 
    payment_id: 175,
    customer_id: 1093,
    customer_name: 'CAMILA GARCIA',
    anticipo_doc: 'ANT-002',
    anticipo_total: 200.00,
    facturas: [{ id: 209, number: 8, saldo: 80.00 }],
    sobrante: 120.00
  },
  { 
    payment_id: 183,
    customer_id: 1122,
    customer_name: 'WENERKY GARCIA',
    anticipo_doc: 'ANT-003',
    anticipo_total: 300.00,
    facturas: [{ id: 217, number: 15, saldo: 240.00 }],
    sobrante: 60.00
  },
  { 
    payment_id: 187,
    customer_id: 1135,
    customer_name: 'MAXIMINA SENA',
    anticipo_doc: 'ANT-004',
    anticipo_total: 510.00,
    facturas: [{ id: 223, number: 21, saldo: 280.00 }],
    sobrante: 230.00
  },
  { 
    payment_id: 188,
    customer_id: 1272,
    customer_name: 'MARIBEL SANCHEZ',
    anticipo_doc: 'ANT-005',
    anticipo_total: 1000.00,
    facturas: [{ id: 224, number: 22, saldo: 360.00 }],
    sobrante: 640.00
  },
  { 
    payment_id: 190,
    customer_id: 1149,
    customer_name: 'LUIS REINOSO',
    anticipo_doc: 'ANT-007',
    anticipo_total: 490.00,
    facturas: [{ id: 229, number: 27, saldo: 160.00 }],
    sobrante: 330.00
  },
  { 
    payment_id: 241,
    customer_id: 1121,
    customer_name: 'MARIA CARLIXTA CRUZ',
    anticipo_doc: 'ANT-018',
    anticipo_total: 240.00,
    facturas: [{ id: 275, number: 56, saldo: 160.00 }],
    sobrante: 80.00
  },
  // Anticipo menor que la deuda (pago parcial)
  { 
    payment_id: 243,
    customer_id: 1175,
    customer_name: 'BEATA ANT. CONTRERAS',
    anticipo_doc: 'ANT-020',
    anticipo_total: 100.00,
    facturas: [{ id: 273, number: 54, saldo: 160.00 }],
    sobrante: 0
  },
];

async function aplicarAnticiposAFacturas() {
  console.log('🔄 Aplicando anticipos a facturas como pagos normales...\n');

  let pagosCreados = 0;
  let anticiposEliminados = 0;
  let anticiposAjustados = 0;

  for (const caso of casos) {
    try {
      await pool.query('BEGIN');

      // 1. Crear pagos aplicados a cada factura
      for (const factura of caso.facturas) {
        const montoPago = factura.saldo;
        
        // Insertar nuevo payment vinculado a la factura
        await pool.query(
          `INSERT INTO payments (company_id, invoice_id, customer_id, amount, payment_method, date, is_advance, document_number)
           VALUES (17, $1, $2, $3, 'cash', NOW(), false, $4)`,
          [factura.id, caso.customer_id, montoPago.toFixed(2), caso.anticipo_doc]
        );

        // Actualizar estado de la factura a 'paid' si está completamente pagada
        const checkPaid = await pool.query(
          `SELECT i.total, COALESCE(SUM(p.amount), 0) as pagado
           FROM invoices i
           LEFT JOIN payments p ON p.invoice_id = i.id
           WHERE i.id = $1
           GROUP BY i.id, i.total`,
          [factura.id]
        );

        if (checkPaid.rows.length > 0) {
          const { total, pagado } = checkPaid.rows[0];
          if (parseFloat(total) <= parseFloat(pagado)) {
            await pool.query(
              'UPDATE invoices SET status = $1 WHERE id = $2',
              ['paid', factura.id]
            );
          }
        }

        console.log(`  → Aplicado $${montoPago.toFixed(2)} a FT-${factura.number.toString().padStart(4, '0')}`);
        pagosCreados++;
      }

      // 2. Convertir transacción ANT a RI y remover referencia al payment
      const transDoc = 'ANT-' + caso.anticipo_doc.split('-')[1].padStart(4, '0');
      await pool.query(
        `UPDATE transactions 
         SET document_type = 'RI',
             amount = $1,
             payment_id = NULL
         WHERE company_id = 17
           AND document_type = 'ANT'
           AND document_number = $2`,
        [caso.facturas.reduce((sum, f) => sum + f.saldo, 0).toFixed(2), transDoc]
      );

      // 3. Eliminar el anticipo original (payment)
      await pool.query(
        'DELETE FROM payments WHERE id = $1',
        [caso.payment_id]
      );

      // 4. Si hay sobrante, crear nuevo anticipo
      if (caso.sobrante > 0) {
        // Generar nuevo número de anticipo
        const nextNum = await pool.query(
          `SELECT COALESCE(MAX(CAST(SUBSTRING(document_number FROM 5) AS INTEGER)), 0) + 1 as next_num
           FROM payments
           WHERE company_id = 17 AND document_number LIKE 'ANT-%'`
        );
        const newAntDoc = `ANT-${nextNum.rows[0].next_num.toString().padStart(3, '0')}`;

        // Insertar nuevo anticipo con el sobrante
        await pool.query(
          `INSERT INTO payments (company_id, customer_id, amount, payment_method, date, is_advance, document_number)
           VALUES (17, $1, $2, 'cash', NOW(), true, $3)`,
          [caso.customer_id, caso.sobrante.toFixed(2), newAntDoc]
        );

        // Crear transacción ANT para el sobrante
        const transNewDoc = `ANT-${nextNum.rows[0].next_num.toString().padStart(4, '0')}`;
        await pool.query(
          `INSERT INTO transactions (company_id, customer_id, document_type, document_number, type, amount, date, description)
           VALUES (17, $1, 'ANT', $2, 'credit', $3, NOW(), $4)`,
          [caso.customer_id, transNewDoc, caso.sobrante.toFixed(2), `Anticipo (sobrante de ${caso.anticipo_doc}) - ${caso.customer_name}`]
        );

        console.log(`  → Sobrante $${caso.sobrante.toFixed(2)} → Nuevo anticipo ${newAntDoc}`);
        anticiposAjustados++;
      } else {
        anticiposEliminados++;
      }

      await pool.query('COMMIT');

      const totalAplicado = caso.facturas.reduce((sum, f) => sum + f.saldo, 0);
      console.log(`✅ ${caso.customer_name.padEnd(35)} | ${caso.anticipo_doc} ($${caso.anticipo_total.toFixed(2)}) → Pagos: $${totalAplicado.toFixed(2)}${caso.sobrante > 0 ? `, Sobrante: $${caso.sobrante.toFixed(2)}` : ''}\n`);

    } catch (error) {
      await pool.query('ROLLBACK');
      console.error(`❌ Error procesando ${caso.anticipo_doc}:`, error.message);
    }
  }

  console.log('\n📈 Resumen:');
  console.log(`  ✅ Pagos creados y aplicados a facturas: ${pagosCreados}`);
  console.log(`  🗑️  Anticipos eliminados completamente: ${anticiposEliminados}`);
  console.log(`  🔄 Anticipos ajustados (con sobrante): ${anticiposAjustados}`);

  await pool.end();
}

aplicarAnticiposAFacturas().catch(console.error);
