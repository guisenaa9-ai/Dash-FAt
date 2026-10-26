import test from 'node:test';
import assert from 'node:assert/strict';
import {scanWorkbook} from './scanner.mjs';

// Mesmo formato do relatório "Conciliação Crédito": .xls que é uma tabela HTML.
const html = `<html><meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8"><body><table>
<tr><td>Contrato</td><td>Empresa</td><td>Cliente</td><td>N&deg Cobran&ccedil;a/Documento</td><td>M&ecirc;s/Ano</td><td>Situa&ccedil;&atilde;o</td><td>Valor da Fatura</td><td>Valor Pago</td><td>CPF</td><td>Valor Net</td></tr>
<tr><td>000001675</td><td>ALASC</td><td>JO&Atilde;O</td><td>000013599</td><td>10/2026</td><td>PAGO</td><td>1.002,51</td><td>449,56</td><td>533.593.302-00</td><td>171.06</td></tr>
</table></body></html>`;

test('Hermanos .xls em HTML lê valores com vírgula, acentos e Valor Net', () => {
  const scan = scanWorkbook(Buffer.from(html), 'Hermanos', '2026-10', 'replace', []);
  assert.deepEqual(scan.invalid, []);
  const [row] = scan.rows;
  assert.equal(row.billed, 100251);
  assert.equal(row.received, 44956);
  assert.equal(row.cost, 17106);
  assert.equal(row.billingIdentifier, '000013599');
  assert.equal(row.beneficiaryName, 'JOÃO');
  assert.equal(scan.incoming.cost, 17106);
});
