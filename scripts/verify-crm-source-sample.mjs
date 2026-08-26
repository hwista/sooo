import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const databaseRoot = path.join(repoRoot, 'packages', 'database');
const requireFromDatabase = createRequire(path.join(databaseRoot, 'package.json'));
const { config: loadEnv } = requireFromDatabase('dotenv');
const { Client } = requireFromDatabase('pg');
const reseed = process.argv.includes('--reseed');
const printCurrent = process.argv.includes('--print-current');

loadEnv({ path: path.join(repoRoot, '.env.local'), quiet: true });
loadEnv({ path: path.join(repoRoot, '.env'), quiet: true, override: false });

const sourceUrl = process.env.DATABASE_URL;
if (!sourceUrl) throw new Error('DATABASE_URL is required.');
const targetUrl = new URL(sourceUrl);
const explicitDatabase = process.env.CRM_SOURCE_SAMPLE_DATABASE_NAME?.trim();
if (explicitDatabase) targetUrl.pathname = `/${explicitDatabase}`;
targetUrl.searchParams.delete('schema');
const databaseName = targetUrl.pathname.slice(1);
if (reseed && !/^ssoo_crm_ralph_[a-z0-9_]+$/.test(databaseName)) {
  throw new Error(`--reseed is restricted to an isolated ssoo_crm_ralph_* database, got ${databaseName}`);
}

const identityManifestPath = path.join(repoRoot, 'docs', 'crm', 'reference', 'source-identity-mapping.json');
const baselinePath = path.join(repoRoot, 'docs', 'crm', 'reference', 'source-sample-baseline.json');
const identityManifest = JSON.parse(fs.readFileSync(identityManifestPath, 'utf8'));
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));

function hash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function rows(client, sql, params = []) {
  return (await client.query(sql, params)).rows;
}

async function takeSnapshot(client) {
  const opportunities = await rows(client, `
    select opportunity_code as "code", opportunity_group_code as "groupCode",
           customer_name as "customerName", opportunity_name as "opportunityName",
           owner_name as "ownerName", business_type as "businessType", industry_line as "industryLine",
           region_code as "region", status_code as "status", version_no as "version",
           confirmed, expected_start_date::text as "startDate", expected_end_date::text as "endDate",
           payment_term_code as "paymentTerm", special_discount_type_code as "discountType",
           coalesce(special_discount_value::text, '') as "discountValue",
           revenue_subtotal::text as "revenueSubtotal", special_discount_amount::text as "discountAmount",
           revenue_total::text as "revenueTotal", cost_total::text as "costTotal"
      from crm.crm_opportunity_m
     where opportunity_code in ('crm-opp-001','crm-opp-001-v2','crm-opp-002','crm-opp-003','crm-opp-004','crm-opp-005','crm-opp-006')
       and is_active = true
     order by opportunity_code
  `);
  const opportunityLines = await rows(client, `
    select o.opportunity_code as "code", l.line_code as "lineCode", l.line_kind_code as "kind",
           l.category_code as "category", l.line_label as "label", coalesce(l.quantity::text, '') as "quantity",
           coalesce(l.unit_price::text, '') as "unitPrice", l.amount::text as "amount",
           coalesce(l.margin_rate::text, '') as "marginRate", coalesce(l.trunc_unit::text, '') as "truncUnit",
           coalesce(l.department, '') as "department", coalesce(l.member_name, '') as "memberName",
           coalesce(l.grade, '') as "grade", coalesce(l.service_type_code, '') as "serviceType",
           l.revenue_linked as "revenueLinked", coalesce(l.revenue_unit_price::text, '') as "revenueUnitPrice",
           l.sort_order as "sortOrder"
      from crm.crm_opportunity_line_d l
      join crm.crm_opportunity_m o on o.opportunity_id = l.opportunity_id
     where o.opportunity_code in ('crm-opp-001','crm-opp-001-v2','crm-opp-002','crm-opp-003','crm-opp-004','crm-opp-005','crm-opp-006')
       and l.is_active = true
     order by o.opportunity_code, l.sort_order, l.line_code
  `);
  const contracts = await rows(client, `
    select contract_code as "code", customer_name as "customerName", contract_name as "contractName",
           owner_name as "ownerName", business_type as "businessType", industry_line as "industryLine",
           region_code as "region", status_code as "status", confirmed,
           contract_start_date::text as "startDate", contract_end_date::text as "endDate",
           wbs_code as "wbsCode", payment_term_code as "paymentTerm",
           revenue_subtotal::text as "revenueSubtotal", special_discount_type_code as "discountType",
           coalesce(special_discount_value::text, '') as "discountValue",
           special_discount_amount::text as "discountAmount", revenue_total::text as "revenueTotal",
           cost_total::text as "costTotal", external_cost_total::text as "externalCostTotal"
      from crm.crm_contract_m
     where contract_code like 'crm-source-ct-%' and is_active = true
     order by contract_code
  `);
  const contractLines = await rows(client, `
    select c.contract_code as "code", l.line_code as "lineCode", l.line_kind_code as "kind",
           l.category_code as "category", l.line_label as "label", coalesce(l.quantity::text, '') as "quantity",
           coalesce(l.unit_price::text, '') as "unitPrice", l.amount::text as "amount",
           coalesce(l.margin_rate::text, '') as "marginRate", coalesce(l.trunc_unit::text, '') as "truncUnit",
           coalesce(l.department, '') as "department", coalesce(l.member_name, '') as "memberName",
           coalesce(l.grade, '') as "grade", coalesce(l.service_type_code, '') as "serviceType",
           coalesce(l.revenue_unit_price::text, '') as "revenueUnitPrice", l.sort_order as "sortOrder"
      from crm.crm_contract_line_d l
      join crm.crm_contract_m c on c.contract_id = l.contract_id
     where c.contract_code like 'crm-source-ct-%' and c.is_active = true and l.is_active = true
     order by c.contract_code, l.sort_order, l.line_code
  `);
  const billingPlans = await rows(client, `
    select c.contract_code as "code", b.billing_ym as "billingYm", b.revenue_amount::text as "revenueAmount",
           b.external_cost_amount::text as "externalCostAmount", b.sort_order as "sortOrder"
      from crm.crm_contract_billing_plan_d b
      join crm.crm_contract_m c on c.contract_id = b.contract_id
     where c.contract_code like 'crm-source-ct-%' and c.is_active = true and b.is_active = true
     order by c.contract_code, b.sort_order, b.billing_ym
  `);
  const billingActuals = await rows(client, `
    select c.contract_code as "code", b.billing_ym as "billingYm", b.revenue_amount::text as "revenueAmount",
           b.external_cost_amount::text as "externalCostAmount", b.sort_order as "sortOrder"
      from crm.crm_contract_billing_actual_d b
      join crm.crm_contract_m c on c.contract_id = b.contract_id
     where c.contract_code like 'crm-source-ct-%' and c.is_active = true and b.is_active = true
     order by c.contract_code, b.sort_order, b.billing_ym
  `);
  const counts = {
    opportunityGroups: new Set(opportunities.map((item) => item.groupCode)).size,
    opportunityVersions: opportunities.length,
    opportunityLines: opportunityLines.length,
    contracts: contracts.length,
    contractLines: contractLines.length,
    billingPlans: billingPlans.length,
    billingActuals: billingActuals.length,
  };
  const values = { opportunities, opportunityLines, contracts, contractLines, billingPlans, billingActuals };
  const sha256 = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, hash(value)]));
  sha256.combined = hash({ counts, sha256 });
  return { counts, sha256 };
}

async function verifyIdentityMapping(client) {
  assert(identityManifest.version === 1, 'source identity mapping version must be 1');
  assert(identityManifest.policy?.sourceAccountCount === 6, 'source account denominator must equal 6');
  assert(identityManifest.policy?.centralBaselineAccountCount === 8, 'central baseline account denominator must equal 8');
  assert(identityManifest.policy?.createsProductionAccounts === false, 'source mapping must not create production accounts');
  assert(identityManifest.policy?.identityEquivalenceClaimed === false, 'functional aliases must not claim identity equivalence');
  assert(identityManifest.mappings?.length === 6, 'source identity manifest must enumerate six source accounts');
  const sourceIds = new Set(identityManifest.mappings.map((item) => item.sourceLoginId));
  assert(sourceIds.size === 6, 'source identity mapping contains duplicate source login IDs');
  const expectedCentral = identityManifest.centralBaselineLoginIds;
  assert(Array.isArray(expectedCentral) && expectedCentral.length === 8 && new Set(expectedCentral).size === 8, 'central baseline must enumerate eight unique login IDs');
  const centralRows = await rows(client, `
    select a.login_id as "loginId"
      from common.cm_user_auth_m a
      join common.cm_user_m u on u.user_id = a.user_id
     where a.login_id = any($1::text[])
     order by a.login_id
  `, [expectedCentral]);
  assert(centralRows.length === 8, `central baseline account lookup expected 8, got ${centralRows.length}`);

  const ownerAliases = await rows(client, `
    select distinct o.owner_name as "sourceName", a.login_id as "centralLoginId"
      from crm.crm_opportunity_m o
      left join common.cm_user_auth_m a on a.user_id = o.owner_user_id
     where o.opportunity_code in ('crm-opp-001','crm-opp-001-v2','crm-opp-002','crm-opp-003','crm-opp-004','crm-opp-005','crm-opp-006')
     order by o.owner_name
  `);
  const actualByName = new Map(ownerAliases.map((item) => [item.sourceName, item.centralLoginId]));
  for (const mapping of identityManifest.mappings.filter((item) => item.sourceLoginId !== 'admin')) {
    assert(actualByName.get(mapping.sourceName) === mapping.centralLoginId, `source owner alias mismatch for ${mapping.sourceLoginId}`);
  }
}

async function applySourceSeeds(client) {
  for (const fileName of ['52_crm_opportunities.sql', '56_crm_source_contracts.sql']) {
    await client.query(fs.readFileSync(path.join(databaseRoot, 'prisma', 'seeds', fileName), 'utf8'));
  }
}

function assertSnapshot(snapshot) {
  assert(JSON.stringify(snapshot.counts) === JSON.stringify(baseline.counts), `source sample counts mismatch: ${JSON.stringify(snapshot.counts)}`);
  for (const [key, expected] of Object.entries(baseline.sha256)) {
    assert(expected !== 'pending', `source sample baseline hash ${key} is not fixed`);
    assert(snapshot.sha256[key] === expected, `source sample ${key} hash mismatch`);
  }
}

const client = new Client({ connectionString: targetUrl.toString() });
await client.connect();
try {
  await verifyIdentityMapping(client);
  if (reseed) {
    await applySourceSeeds(client);
    const first = await takeSnapshot(client);
    await applySourceSeeds(client);
    const second = await takeSnapshot(client);
    assert(JSON.stringify(first) === JSON.stringify(second), 'source seed is not idempotent across the first and second reseed');
    if (printCurrent) process.stdout.write(`${JSON.stringify(first, null, 2)}\n`);
    else assertSnapshot(second);
  } else {
    const snapshot = await takeSnapshot(client);
    if (printCurrent) process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`);
    else assertSnapshot(snapshot);
  }
  if (!printCurrent) process.stdout.write(`PASS CRM source sample counts, hashes, identity mapping${reseed ? ', and two-pass idempotency' : ''}\n`);
} finally {
  await client.end();
}
