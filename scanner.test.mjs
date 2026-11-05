import test from 'node:test';
import assert from 'node:assert/strict';
import {scanWorkbook} from './scanner.mjs';

// Mesmo formato do relatório "Conciliação Crédito": .xls que é uma tabela HTML.
// Todos os dados desta fixture sao ficticios e exclusivos de teste.
const html = `<html><meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8"><body><table>
<tr><td>Contrato</td><td>Empresa</td><td>Cliente</td><td>N&deg Cobran&ccedil;a/Documento</td><td>M&ecirc;s/Ano</td><td>Situa&ccedil;&atilde;o</td><td>Valor da Fatura</td><td>Valor Pago</td><td>CPF</td><td>Valor Net</td></tr>
<tr><td>CONTRATO-FICTICIO-001</td><td>Empresa Ficticia de Teste</td><td>Cliente Ficticio de Teste</td><td>COBRANCA-TESTE-001</td><td>10/2026</td><td>PAGO</td><td>100,00</td><td>80,00</td><td>111.444.777-35</td><td>10,00</td></tr>
</table></body></html>`;

test('Hermanos .xls em HTML lê valores com vírgula, acentos e Valor Net', () => {
  const scan = scanWorkbook(Buffer.from(html), 'Hermanos', '2026-10', 'replace', []);
  assert.deepEqual(scan.invalid, []);
  const [row] = scan.rows;
  assert.equal(row.billed, 10000);
  assert.equal(row.received, 8000);
  assert.equal(row.cost, 1000);
  assert.equal(row.billingIdentifier, 'COBRANCA-TESTE-001');
  assert.equal(row.beneficiaryName, 'Cliente Ficticio de Teste');
  assert.equal(scan.incoming.cost, 1000);
});
