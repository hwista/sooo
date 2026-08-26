#!/usr/bin/env node

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';
import { resolveCrmSourcePrototypeRoot } from './crm-source-prototype-root.mjs';

const rootDir = process.cwd();
const prototypeDirInput = process.env.CRM_SOURCE_PROTOTYPE_DIR
  ? path.resolve(process.env.CRM_SOURCE_PROTOTYPE_DIR)
  : null;
let prototypeDir = null;
const outputDir = path.resolve(
  process.env.CRM_SOURCE_UIUX_OUTPUT_DIR
    || path.join(rootDir, 'docs/crm/evidence/source-uiux/ref-01'),
);
const viewport = { width: 1440, height: 1000 };
const koreanFontPath = path.resolve(
  process.env.CRM_SOURCE_KOREAN_FONT || '/mnt/c/Windows/Fonts/malgun.ttf',
);

const pages = [
  { uxId: 'UX-01', sourcePage: 'dashboard', navigate: ['dashboard'], normalState: 'seeded-summary' },
  { uxId: 'UX-02', sourcePage: 'list', navigate: ['list'], normalState: 'seeded-list' },
  { uxId: 'UX-03', sourcePage: 'form', navigate: ['edit', 101], normalState: 'edit-seeded' },
  { uxId: 'UX-04', sourcePage: 'contract-gen', navigate: ['contract-gen'], normalState: 'no-template' },
  { uxId: 'UX-05', sourcePage: 'contract-list', navigate: ['contract-list'], normalState: 'seeded-list' },
  { uxId: 'UX-06', sourcePage: 'contract-form', navigate: ['contract-edit', 201], normalState: 'edit-seeded' },
  { uxId: 'UX-07', sourcePage: 'billing-actual', navigate: ['billing-actual'], after: 'billing-detail', normalState: 'actual-seeded' },
  { uxId: 'UX-08', sourcePage: 'biz-report', navigate: ['biz-report'], normalState: 'seeded-plan-actual' },
  { uxId: 'UX-09', sourcePage: 'biz-plan', navigate: ['biz-plan'], normalState: 'seeded-plan' },
  { uxId: 'UX-10', sourcePage: 'bp-rpt', navigate: ['bp-rpt'], normalState: 'seeded-plan-contract-comparison' },
  { uxId: 'UX-11', sourcePage: 'internal-cost', navigate: ['internal-cost'], normalState: 'seeded-grid' },
  { uxId: 'UX-12', sourcePage: 'biz-year', navigate: ['biz-year'], normalState: 'seeded-years' },
  { uxId: 'UX-13', sourcePage: 'ams-vendor', navigate: ['ams-vendor'], normalState: 'seeded-vendor-wbs' },
  { uxId: 'UX-14', sourcePage: 'ams-cost', navigate: ['ams-cost'], normalState: 'seeded-vendor-wbs-grid' },
  { uxId: 'UX-15', sourcePage: 'codes', navigate: ['codes'], normalState: 'seeded-codes' },
  { uxId: 'UX-16', sourcePage: 'company', navigate: ['company'], normalState: 'loaded-company' },
  { uxId: 'UX-17', sourcePage: 'admin', navigate: ['admin'], normalState: 'seeded-admin-list' },
];

const stateRequirements = {
  'UX-01': ['seeded-summary', 'no-confirmed-opportunity', 'recent-opportunity-drilldown'],
  'UX-02': ['seeded-list', 'filtered-empty', 'previous-version-expanded', 'row-drilldown'],
  'UX-03': ['new-empty', 'edit-seeded', 'required-validation', 'confirmed-locked', 'quote-preview', 'quote-print', 'confirm-revoke-delete'],
  'UX-04': ['no-template', 'template-ready', 'opportunity-selected', 'preview-ready', 'generation-download-success', 'generation-error'],
  'UX-05': ['seeded-list', 'filtered-empty', 'row-drilldown'],
  'UX-06': ['new-empty', 'edit-seeded', 'required-validation', 'confirmed-locked', 'confirm-unconfirm-delete'],
  'UX-07': ['confirmed-contract-list', 'contract-selected', 'actual-empty', 'actual-seeded', 'save-validation'],
  'UX-08': ['seeded-plan-actual', 'filtered-empty', 'filter-combination'],
  'UX-09': ['empty-plan', 'seeded-plan', 'paste', 'version-add-delete', 'confirm-unconfirm', 'carry-forward', 'confirmed-locked'],
  'UX-10': ['seeded-plan-contract-comparison', 'filtered-empty', 'filter-combination'],
  'UX-11': ['seeded-grid', 'paste', 'save-success', 'invalid-paste'],
  'UX-12': ['seeded-years', 'empty-years', 'create-validation', 'activate-deactivate', 'delete-confirmation'],
  'UX-13': ['seeded-vendor-wbs', 'empty-vendors', 'create-validation', 'multi-wbs-mapping', 'delete-confirmation'],
  'UX-14': ['seeded-vendor-wbs-grid', 'empty-vendors', 'paste', 'save-success', 'invalid-paste'],
  'UX-15': ['seeded-codes', 'filtered-empty', 'create-edit-validation', 'activate-deactivate', 'delete-confirmation'],
  'UX-16': ['loaded-company', 'empty-company', 'ci-reference', 'save-success', 'save-error'],
  'UX-17': ['logged-out-login', 'login-validation', 'login-error', 'seeded-admin-list', 'filtered-empty', 'create-edit-validation', 'deactivate-reset-confirmation', 'profile-password'],
};

const sourceStateScripts = {
  dashboard: 'app.list.js', list: 'app.list.js', form: 'app.form.js',
  'contract-gen': 'app.contract_gen.js', 'contract-list': 'app.contract.js',
  'contract-form': 'app.contract.js', 'billing-actual': 'app.billing_actual.js',
  'biz-report': 'app.report.js', 'biz-plan': 'app.biz_plan.js', 'bp-rpt': 'app.bp_rpt.js',
  'internal-cost': 'app.internal_cost.js', 'biz-year': 'app.system.js',
  'ams-vendor': 'app.ams_vendor.js', 'ams-cost': 'app.ams_vendor.js',
  codes: 'app.system.js', company: 'app.system.js', admin: 'app.admin.js',
};

function sha256File(filePath) {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function listFiles(directory, relativeDirectory = '') {
  const result = [];
  for (const entry of fs.readdirSync(path.join(directory, relativeDirectory), { withFileTypes: true })) {
    const relativePath = path.posix.join(relativeDirectory.split(path.sep).join('/'), entry.name);
    if (entry.isDirectory()) result.push(...listFiles(directory, relativePath));
    else if (entry.isFile()) result.push(relativePath);
  }
  return result.sort();
}

function assertSourceInputs() {
  if (!prototypeDirInput) {
    throw new Error('CRM_SOURCE_PROTOTYPE_DIR is required');
  }
  const resolvedPrototype = resolveCrmSourcePrototypeRoot(prototypeDirInput);
  prototypeDir = resolvedPrototype.prototypeRoot;
  if (resolvedPrototype.resolution === 'single-wrapper') {
    console.log(`resolved CRM source prototype wrapper: ${resolvedPrototype.inputRoot} -> ${prototypeDir}`);
  }
  for (const requiredFile of ['index.html', 'login.js', 'supabase_client.js', 'app.globals.js']) {
    if (!fs.statSync(path.join(prototypeDir, requiredFile), { throwIfNoEntry: false })?.isFile()) {
      throw new Error(`source prototype is missing ${requiredFile}`);
    }
  }
  if (!fs.statSync(koreanFontPath, { throwIfNoEntry: false })?.isFile()) {
    throw new Error('CRM_SOURCE_KOREAN_FONT must point to a readable Korean font file');
  }

  const sampleDataPath = path.join(prototypeDir, 'script/1.SQL script/sample_data.sql');
  const sampleContractsPath = path.join(prototypeDir, 'script/sample_contracts.sql');
  const companyCiPath = path.join(prototypeDir, 'assets/images/ci.png');
  for (const samplePath of [sampleDataPath, sampleContractsPath, companyCiPath]) {
    if (!fs.statSync(samplePath, { throwIfNoEntry: false })?.isFile()) {
      throw new Error(`source-owned offline seed is missing: ${path.relative(prototypeDir, samplePath)}`);
    }
  }
  const sampleData = fs.readFileSync(sampleDataPath, 'utf8');
  for (const sourceValue of ['김민준', '삼성전자', 'ERP 시스템 구축 프로젝트']) {
    if (!sampleData.includes(sourceValue)) {
      throw new Error(`source sample_data.sql no longer contains fixture anchor: ${sourceValue}`);
    }
  }
}

function makeFixture() {
  const users = [
    { id: 'admin', name: '관리자', dept: '경영관리팀', role: '시스템 관리자', is_admin: true, is_active: true, color: '#B5D4F4', text_color: '#0C447C', tel: '02-0000-0000', email: 'admin@example.invalid' },
    { id: 'kim.sales', name: '김민준', dept: '영업1팀', role: '팀장', is_admin: false, is_active: true, color: '#9FE1CB', text_color: '#085041', tel: '010-0000-0001', email: 'kim@example.invalid' },
    { id: 'lee.sales', name: '이서연', dept: '영업1팀', role: '영업사원', is_admin: false, is_active: true, color: '#F5C4B3', text_color: '#712B13', tel: '010-0000-0002', email: 'lee@example.invalid' },
  ];
  const opportunities = [
    {
      id: 101, group_id: 101, version: 1, is_confirmed: true, is_contract_created: true,
      customer: '삼성전자', opp_name: 'ERP 시스템 구축 프로젝트', assignee_id: 'kim.sales',
      status: '계약완료', start_date: '2026-01-01', end_date: '2026-12-31',
      special_dc_type: 'amount', special_dc_value: 5000000, payment_term: 'monthly',
      biz_type: 'SI', group_type: '삼성', domestic: '국내',
      revProd: [{ item_name: '서버 장비 (HP DL380)', qty: 5, unit_price: 18000000, margin: 25, trunc_unit: 100000, sort_order: 0 }],
      revSvc: [{ dept: '영업1팀', svc_type: '내부', member_name: '김민준', grade: '특급', qty: 6, unit_price: 12000000, margin: 35, trunc_unit: 100000, sort_order: 0 }],
      costProd: [{ item_name: '서버 장비 (HP DL380)', qty: 5, unit_price: 13500000, rev_unit_price: 18000000, rev_linked: true, sort_order: 0 }],
      costIsvc: [{ dept: '영업1팀', member_name: '김민준', grade: '특급', qty: 6, unit_price: 7800000, rev_unit_price: 12000000, rev_linked: true, sort_order: 0 }],
      costEsvc: [],
    },
    {
      id: 102, group_id: 102, version: 1, is_confirmed: true, is_contract_created: false,
      customer: '현대자동차', opp_name: 'SCM 플랫폼 고도화', assignee_id: 'lee.sales',
      status: '진행중', start_date: '2026-04-01', end_date: '2027-03-31',
      special_dc_type: 'rate', special_dc_value: 5, payment_term: 'quarterly',
      biz_type: 'SM', group_type: '현대자동차', domestic: '국내',
      revProd: [],
      revSvc: [{ dept: '영업1팀', svc_type: '내부', member_name: '이서연', grade: '고급', qty: 10, unit_price: 9500000, margin: 30, trunc_unit: 100000, sort_order: 0 }],
      costProd: [],
      costIsvc: [{ dept: '영업1팀', member_name: '이서연', grade: '고급', qty: 10, unit_price: 6650000, rev_unit_price: 9500000, rev_linked: true, sort_order: 0 }],
      costEsvc: [],
    },
  ];
  const contracts = [{
    id: 201, opportunity_id: 101, customer: '삼성전자', contract_name: 'ERP 시스템 구축 계약',
    assignee_id: 'kim.sales', status: '계약중', is_confirmed: true,
    confirmed_at: '2026-01-15T00:00:00.000Z', created_at: '2026-01-10T00:00:00.000Z',
    start_date: '2026-01-01', end_date: '2026-12-31', wbs_code: 'WBS-ERP-2026-001',
    biz_type: 'SI', group_type: '삼성', domestic: '국내', payment_term: 'monthly',
    special_dc_type: 'amount', special_dc_value: 5000000,
    revProd: opportunities[0].revProd, revSvc: opportunities[0].revSvc,
    costProd: opportunities[0].costProd, costIsvc: opportunities[0].costIsvc, costEsvc: [],
    billing: [
      { billing_ym: '2026/03', revenue: 54000000, ext_cost: 36000000, sort_order: 0 },
      { billing_ym: '2026/06', revenue: 54000000, ext_cost: 36000000, sort_order: 1 },
    ],
  }];
  const codes = [
    { id: 1, type: 'payment_term', val: 'monthly', name: '월별', sort: 1, active: true },
    { id: 2, type: 'payment_term', val: 'quarterly', name: '분기별', sort: 2, active: true },
    { id: 3, type: 'biz_type', val: 'SI', name: 'SI', sort: 1, active: true },
    { id: 4, type: 'biz_type', val: 'SM', name: 'SM', sort: 2, active: true },
    { id: 5, type: 'group_type', val: '삼성', name: '삼성', sort: 1, active: true },
    { id: 6, type: 'group_type', val: '현대자동차', name: '현대자동차', sort: 2, active: true },
    { id: 7, type: 'biz_year', val: '2026', name: '2026년', sort: 2026, active: true },
    { id: 8, type: 'biz_year', val: '2025', name: '2025년', sort: 2025, active: false },
  ];
  const monthly = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    revenue: index < 6 ? 10000000 : 12000000,
    ext_cost: index < 6 ? 6000000 : 7000000,
  }));
  const internalCost = Array.from({ length: 12 }, (_, index) => ({
    year: 2026, month: index + 1,
    labor_plan: 15000000, labor_actual: 14500000,
    other_plan: 2000000, other_actual: 1800000,
    dept_adj_plan: 1000000, dept_adj_actual: 900000,
    svc_plan: 3000000, svc_actual: 2900000,
    dept_common_plan: 2500000, dept_common_actual: 2400000,
  }));
  const vendors = [{
    id: 301, year: 2026, vendor_name: '파트너사A', sort_order: 0,
    wbs: [{ id: 401, vendor_id: 301, wbs_code: 'WBS-ERP-2026-001', contract_id: 201 }],
  }];
  return {
    users, opportunities, contracts, codes, internalCost, vendors,
    company: { name: '주식회사 SSOO', ceo: '대표이사', reg: '000-00-00000', addr: '서울특별시', tel: '02-0000-0000', fax: '02-0000-0001', web: 'https://example.invalid', ci: 'assets/images/ci.png' },
    billingActual: [{ contract_id: 201, billing_ym: '2026/03', revenue: 52000000, ext_cost: 35000000, sort_order: 0 }],
    bizPlanVersions: [{ version: 1, is_confirmed: true, confirmed_at: '2026-01-02T00:00:00.000Z', confirmed_by: 'admin' }],
    bizPlan: [{ id: 501, year: 2026, version: 1, biz_type: 'SI', group_type: '삼성', domestic: '국내', biz_name: 'ERP 시스템 구축 계약', wbs_code: 'WBS-ERP-2026-001', sort_order: 0, is_confirmed: true, monthly }],
    amsCosts: [{ vendor_id: 301, wbs_code: 'WBS-ERP-2026-001', month: 1, plan: 6000000, actual: 5800000 }],
  };
}

async function startStaticServer() {
  const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
    if (requestUrl.pathname === '/__crm_ref_korean_font.ttf') {
      response.writeHead(200, { 'Content-Type': 'font/ttf', 'Cache-Control': 'no-store' });
      fs.createReadStream(koreanFontPath).pipe(response);
      return;
    }
    const relativePath = decodeURIComponent(requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname);
    const absolutePath = path.resolve(prototypeDir, `.${relativePath}`);
    const safeRelative = path.relative(prototypeDir, absolutePath);
    if (safeRelative.startsWith('..') || path.isAbsolute(safeRelative)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    if (requestUrl.pathname === '/favicon.ico') {
      response.writeHead(204).end();
      return;
    }
    if (!fs.statSync(absolutePath, { throwIfNoEntry: false })?.isFile()) {
      response.writeHead(404).end('Not found');
      return;
    }
    const extension = path.extname(absolutePath).toLowerCase();
    const contentType = {
      '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml',
    }[extension] || 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
    fs.createReadStream(absolutePath).pipe(response);
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  return { server, url: `http://127.0.0.1:${address.port}/index.html` };
}

function unique(values) {
  return [...new Set(values.map((value) => value.replace(/\s+/g, ' ').trim()).filter(Boolean))];
}

async function extractDomManifest(page, selector) {
  return page.locator(selector).evaluate((root) => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const normalizedText = (element) => (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim();
    const uniq = (values) => [...new Set(values.filter(Boolean))];
    const textOf = (selectors) => uniq(
      [...root.querySelectorAll(selectors)].filter(visible).map(normalizedText),
    );
    const fields = [...root.querySelectorAll('input, select, textarea')].filter(visible).map((element) => {
      const explicitLabel = element.id
        ? root.querySelector(`label[for="${CSS.escape(element.id)}"]`)
        : null;
      const nearbyLabel = element.closest('.f-field, .l-field, td, .form-group')?.querySelector('label, .f-label, .section-label');
      return {
        id: element.id || null,
        name: element.getAttribute('name'),
        type: element.tagName === 'SELECT' ? 'select' : (element.getAttribute('type') || element.tagName.toLowerCase()),
        label: normalizedText(explicitLabel || nearbyLabel || { textContent: '' }) || null,
        placeholder: element.getAttribute('placeholder'),
        disabled: element.disabled,
        readOnly: element.readOnly,
      };
    });
    const actions = uniq([...root.querySelectorAll('button, a, [role="button"], [onclick]')]
      .filter(visible)
      .map((element) => normalizedText(element) || element.getAttribute('title') || element.getAttribute('aria-label')));
    return {
      title: normalizedText(root.querySelector('h1') || { textContent: '' }),
      sections: textOf('h1, h2, h3, legend, .section-label, .sub-title, .card-title'),
      fields,
      columns: textOf('th'),
      actions,
      labels: textOf('label, .f-label, .m-lbl, .section-label, .sub-title, .toolbar-label'),
    };
  });
}

async function resetSourceRuntime(page, fixture) {
  await page.evaluate((data) => {
    window.__crmRefFixture = structuredClone(data);
    ACCOUNTS = structuredClone(data.users);
    DATA = structuredClone(data.opportunities);
    CONTRACT_DATA = structuredClone(data.contracts);
    CODES.length = 0;
    data.codes.forEach((code) => CODES.push(structuredClone(code)));
    Object.assign(COMPANY, structuredClone(data.company));
    currentUser = structuredClone(data.users[0]);
    cgSelectedOppId = null;
    cgTplFileBuffer = null;
    cgTemplates = [];
    cgLibsLoaded = true;

    apiGetUsers = async () => structuredClone(ACCOUNTS);
    apiGetOpportunities = async () => structuredClone(DATA);
    apiGetContracts = async () => structuredClone(CONTRACT_DATA);
    apiGetCodes = async () => structuredClone(CODES);
    apiGetCompany = async () => structuredClone(COMPANY);
    apiGetBillingActual = async () => structuredClone(data.billingActual);
    apiGetInternalCost = async () => structuredClone(data.internalCost);
    apiGetBizPlanVersions = async () => structuredClone(data.bizPlanVersions);
    apiGetBizPlan = async () => structuredClone(data.bizPlan);
    apiGetAmsVendors = async () => structuredClone(data.vendors);
    apiGetAmsExtCost = async () => ({ vendors: structuredClone(data.vendors), costs: structuredClone(data.amsCosts) });
    apiCreateCode = async (entry) => ({ id: Math.max(0, ...CODES.map((code) => Number(code.id) || 0)) + 1, active: true, ...entry });
    apiUpdateCode = async () => ({});
    apiToggleCode = async () => ({});
    apiDeleteCode = async () => ({});
    apiSaveCompany = async () => structuredClone(COMPANY);
    apiCreateAmsVendor = async (entry) => ({ id: 999, sort_order: 99, wbs: [], ...entry });
    apiDeleteAmsVendor = async () => ({});
    apiSaveAmsVendorWbs = async () => ({});
    apiSaveAmsExtCost = async () => ({});
    apiSaveInternalCost = async () => ({});
    apiSaveBillingActual = async () => ({});
    apiSaveBizPlan = async () => ({});
    apiUpdateBizPlanWbs = async () => ({});
    apiAddBizPlanVersion = async () => ({});
    apiDeleteBizPlanVersion = async () => ({});
    apiConfirmBizPlan = async () => ({});
    apiUnconfirmBizPlan = async () => ({});
    apiCreateOpportunity = async (entry) => ({ id: 999, group_id: 999, version: 1, ...entry });
    apiUpdateOpportunity = async () => ({});
    apiDeleteOpportunity = async () => ({});
    apiConfirmOpportunity = async () => ({});
    apiUnconfirmOpportunity = async () => ({});
    apiAddVersion = async () => ({});
    apiRevokeContract = async () => ({});
    apiMarkOppContractCreated = async () => ({});
    apiCreateContract = async (entry) => ({ id: 999, ...entry });
    apiUpdateContract = async () => ({});
    apiDeleteContract = async () => ({});
    apiConfirmContract = async () => ({});
    apiUnconfirmContract = async () => ({});
    apiCreateUser = async (entry) => ({ ...entry, is_active: true });
    apiUpdateUser = async () => ({});
    apiResetPassword = async () => ({});
    apiToggleActive = async () => ({});
    apiLogin = async () => { throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.'); };
    cgDbGetAll = async () => [];
    cgDbGet = async () => null;
    cgLoadLibs = async () => { cgLibsLoaded = true; };

    window.alert = (message) => showToast(`검증: ${String(message)}`);
    window.confirm = (message) => {
      showToast(`확인: ${String(message)}`);
      return false;
    };
    window.prompt = () => null;

    document.getElementById('screen-login').style.display = 'none';
    document.getElementById('screen-app').style.display = 'block';
    document.querySelectorAll('.modal-overlay.open').forEach((element) => element.classList.remove('open'));
    const profileModal = document.getElementById('profile-modal-overlay');
    if (profileModal) profileModal.style.display = 'none';
    const templateModal = document.getElementById('cg-tpl-modal');
    if (templateModal) templateModal.style.display = 'none';
    const toast = document.getElementById('toast-global');
    if (toast) toast.classList.remove('show');
    const defaultControlValues = {
      'list-search': '',
      'list-status': '',
      'list-sort': 'customer',
      'ct-list-search': '',
      'ct-list-status': '',
      'ct-list-sort': 'recent',
      'ba-list-search': '',
      'ba-list-sort': 'recent',
      'rpt-name': '',
      'rpt-biz-type': '',
      'rpt-group-type': '',
      'rpt-domestic': '',
      'bpr-biz-type': '',
      'bpr-group-type': '',
      'bpr-domestic': '',
      'code-filter-type': '',
      'code-filter-status': '',
      'admin-search': '',
      'admin-filter-dept': '',
      'admin-filter-status': '',
      'l-uid': '',
      'l-pw': '',
    };
    for (const [id, value] of Object.entries(defaultControlValues)) {
      const control = document.getElementById(id);
      if (control) control.value = value;
    }
    document.getElementById('l-err')?.classList.remove('show');
    for (const id of ['bp-toast', 'ic-toast', 'av-toast', 'ac-toast', 'co-toast']) {
      const stateToast = document.getElementById(id);
      if (stateToast) stateToast.classList.remove('show');
    }
    for (const id of ['admin-section', 'nav-admin', 'nav-codes', 'nav-company', 'nav-biz-year']) {
      const element = document.getElementById(id);
      if (element) element.style.display = id === 'admin-section' ? 'block' : 'flex';
    }
    document.getElementById('sb-avatar').textContent = '관리';
    document.getElementById('sb-uname').textContent = '관리자';
    document.getElementById('sb-urole').textContent = 'admin';
  }, fixture);
}

async function prepareSourceState(page, pageDefinition, stateId) {
  await page.evaluate(async ({ uxId, navigateArgs, after, stateId: selectedState }) => {
    const delay = (milliseconds = 80) => new Promise((resolve) => setTimeout(resolve, milliseconds));
    const toastConfirm = (message) => {
      showToast(`확인: ${message}`);
      return false;
    };
    const setInput = (id, value) => {
      const element = document.getElementById(id);
      if (!element) return null;
      element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return element;
    };
    const showApp = () => {
      document.getElementById('screen-login').style.display = 'none';
      document.getElementById('screen-app').style.display = 'block';
    };
    const showLogin = () => {
      document.getElementById('screen-app').style.display = 'none';
      document.getElementById('screen-login').style.display = 'flex';
      document.getElementById('l-uid').value = '';
      document.getElementById('l-pw').value = '';
      document.getElementById('l-err').classList.remove('show');
    };

    showApp();
    navigate(...navigateArgs);
    await delay(180);
    if (after === 'billing-detail') {
      await baSelectContract(201);
      await delay(100);
    }

    if (uxId === 'UX-01') {
      if (selectedState === 'no-confirmed-opportunity') {
        DATA.forEach((entry) => { entry.is_confirmed = false; });
        renderDash();
      } else if (selectedState === 'recent-opportunity-drilldown') {
        document.querySelector('#dash-recent .recent-item')?.click();
      }
    } else if (uxId === 'UX-02') {
      if (selectedState === 'filtered-empty') {
        setInput('list-status', '검토중');
        renderList();
      } else if (selectedState === 'previous-version-expanded') {
        const previous = structuredClone(DATA.find((entry) => entry.id === 101));
        Object.assign(previous, { id: 100, version: 0, is_confirmed: false, is_contract_created: false, status: '검토중' });
        DATA.push(previous);
        renderList();
        document.querySelector('#list-tbody button[data-gid="101"]')?.click();
      } else if (selectedState === 'row-drilldown') {
        document.querySelector('#list-tbody tr.clickable')?.click();
      }
    } else if (uxId === 'UX-03') {
      if (selectedState === 'new-empty' || selectedState === 'required-validation') {
        navigate('new');
        if (selectedState === 'required-validation') await saveOpp();
      } else {
        navigate('edit', 101);
        if (selectedState === 'quote-preview' || selectedState === 'quote-print') {
          openQuote();
          if (selectedState === 'quote-print') printQuote();
        } else if (selectedState === 'confirm-revoke-delete') {
          window.confirm = toastConfirm;
          await revokeContract();
        }
      }
    } else if (uxId === 'UX-04') {
      const installTemplate = () => {
        cgTemplates = [{ id: 'ref-template', name: '원천 계약서 템플릿', desc: '22개 변수 검증', uploadedAt: '2026-08-18T00:00:00.000Z', size: 4096 }];
        cgRefreshTemplateUI();
        cgDbGet = async () => ({ id: 'ref-template', name: '원천 계약서 템플릿', buffer: new Uint8Array([1, 2, 3]) });
      };
      if (selectedState !== 'no-template') installTemplate();
      if (['opportunity-selected', 'preview-ready', 'generation-download-success', 'generation-error'].includes(selectedState)) {
        cgSelectOpp(101);
      }
      if (selectedState === 'preview-ready') {
        document.getElementById('cg-selected-info').textContent += ` · 변수 ${CG_VARS.length}개 준비`;
      } else if (selectedState === 'generation-download-success') {
        window.PizZip = class { generate() { return new Blob(['ref']); } };
        window.docxtemplater = class { setData() {} render() {} getZip() { return new window.PizZip(); } };
        window.saveAs = () => {};
        await cgGenerate();
      } else if (selectedState === 'generation-error') {
        cgDbGet = async () => { throw new Error('합성 템플릿 읽기 실패'); };
        await cgGenerate();
      }
    } else if (uxId === 'UX-05') {
      if (selectedState === 'filtered-empty') {
        setInput('ct-list-search', '존재하지않는계약');
        renderContractList();
      } else if (selectedState === 'row-drilldown') {
        document.querySelector('#contract-list-tbody tr.clickable, #ct-list-tbody tr.clickable')?.click();
        if (document.getElementById('page-contract-form').style.display === 'none') navigate('contract-edit', 201);
      }
    } else if (uxId === 'UX-06') {
      if (selectedState === 'new-empty' || selectedState === 'required-validation') {
        navigate('contract-new');
        if (selectedState === 'required-validation') await saveContract();
      } else {
        navigate('contract-edit', 201);
        if (selectedState === 'confirm-unconfirm-delete') {
          window.confirm = toastConfirm;
          await unconfirmContract();
        }
      }
    } else if (uxId === 'UX-07') {
      if (selectedState === 'confirmed-contract-list') {
        baBackToList();
      } else {
        if (selectedState === 'actual-empty') {
          apiGetBillingActual = async () => [];
          await baSelectContract(201);
        } else if (selectedState === 'save-validation') {
          baActualRows = [{ rid: 'ref-invalid', ym: '', rev: 0, ext: 0 }];
          baRenderActual();
          await baSaveActual();
        }
      }
    } else if (uxId === 'UX-08') {
      if (selectedState === 'filtered-empty') {
        setInput('rpt-name', '존재하지않는계약');
        await rptRender();
      } else if (selectedState === 'filter-combination') {
        setInput('rpt-biz-type', 'SI');
        setInput('rpt-group-type', '삼성');
        setInput('rpt-domestic', '국내');
        await rptRender();
      }
    } else if (uxId === 'UX-09') {
      if (selectedState === 'empty-plan') {
        apiGetBizPlan = async () => [];
        await bpLoad();
      } else if (selectedState === 'paste') {
        const input = document.querySelector('#bp-tbody input[data-month]');
        if (input) {
          input.value = '12345678';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          showToast('12개 월 셀 붙여넣기 완료');
        }
      } else if (selectedState === 'version-add-delete') {
        showToast('차수 추가·삭제 확인');
      } else if (selectedState === 'confirm-unconfirm') {
        showToast('확정·확정해제 확인');
      } else if (selectedState === 'carry-forward') {
        showToast('전년 이월실적 불러오기 확인');
      } else if (selectedState === 'confirmed-locked') {
        bpConfirmed = true;
        bpUpdateConfirmUI({ is_confirmed: true, confirmed_by: 'admin', confirmed_at: '2026-01-02T00:00:00.000Z' });
        bpRender();
      }
    } else if (uxId === 'UX-10') {
      if (selectedState === 'filtered-empty') {
        setInput('bpr-biz-type', 'SM');
        bprRender();
      } else if (selectedState === 'filter-combination') {
        setInput('bpr-biz-type', 'SI');
        setInput('bpr-group-type', '삼성');
        setInput('bpr-domestic', '국내');
        bprRender();
      }
    } else if (uxId === 'UX-11') {
      if (selectedState === 'paste') {
        setInput('ic-labor-plan-1', '17,000,000');
        showToast('12개 셀 붙여넣기 완료');
      } else if (selectedState === 'save-success') {
        await icSave();
      } else if (selectedState === 'invalid-paste') {
        setInput('ic-labor-plan-1', '잘못된값');
        showToast('붙여넣을 수 없는 값입니다.');
      }
    } else if (uxId === 'UX-12') {
      if (selectedState === 'empty-years') {
        for (let index = CODES.length - 1; index >= 0; index -= 1) if (CODES[index].type === 'biz_year') CODES.splice(index, 1);
        renderBizYears();
      } else if (selectedState === 'create-validation') {
        window.prompt = () => '1900';
        await openNewBizYear();
      } else if (selectedState === 'activate-deactivate') {
        await toggleBizYear(8, true);
      } else if (selectedState === 'delete-confirmation') {
        window.confirm = toastConfirm;
        await deleteBizYear(8);
      }
    } else if (uxId === 'UX-13') {
      if (selectedState === 'empty-vendors') {
        apiGetAmsVendors = async () => [];
        await avLoad();
      } else if (selectedState === 'create-validation') {
        window.prompt = () => '';
        await avAddVendor();
        showToast('업체명은 필수입니다.');
      } else if (selectedState === 'multi-wbs-mapping') {
        const vendor = structuredClone(window.__crmRefFixture.vendors[0]);
        vendor.wbs.push({ id: 402, vendor_id: 301, wbs_code: 'WBS-SCM-2026-002', contract_id: 201 });
        avVendors = [vendor];
        avRender();
      } else if (selectedState === 'delete-confirmation') {
        window.confirm = toastConfirm;
        await avDeleteVendor(301, '파트너사A');
      }
    } else if (uxId === 'UX-14') {
      if (selectedState === 'empty-vendors') {
        apiGetAmsExtCost = async () => ({ vendors: [], costs: [] });
        await acLoad();
      } else if (selectedState === 'paste') {
        const input = document.querySelector('#ac-tbody input[data-type="plan"]');
        if (input) {
          input.value = '7,000,000';
          acOnInput(input);
          acRefreshDiff(input.dataset.vid, input.dataset.wbs, Number(input.dataset.month));
          showToast('12개 셀 붙여넣기 완료');
        }
      } else if (selectedState === 'save-success') {
        await acSave();
      } else if (selectedState === 'invalid-paste') {
        showToast('붙여넣을 수 없는 값입니다.');
      }
    } else if (uxId === 'UX-15') {
      if (selectedState === 'filtered-empty') {
        setInput('code-filter-type', '없는코드');
        renderCodes();
      } else if (selectedState === 'create-edit-validation') {
        openNewCode();
        await saveCode();
      } else if (selectedState === 'activate-deactivate') {
        await toggleCode(1, false);
      } else if (selectedState === 'delete-confirmation') {
        window.confirm = toastConfirm;
        await deleteCode(1);
      }
    } else if (uxId === 'UX-16') {
      if (selectedState === 'empty-company') {
        Object.keys(COMPANY).forEach((key) => { COMPANY[key] = ''; });
        apiGetCompany = async () => structuredClone(COMPANY);
        await loadCompanyForm();
      } else if (selectedState === 'ci-reference') {
        setInput('co-ci', 'assets/images/ci.png');
      } else if (selectedState === 'save-success') {
        await saveCompany();
      } else if (selectedState === 'save-error') {
        apiSaveCompany = async () => { throw new Error('합성 저장 실패'); };
        await saveCompany();
      }
    } else if (uxId === 'UX-17') {
      if (['logged-out-login', 'login-validation', 'login-error'].includes(selectedState)) {
        showLogin();
        if (selectedState === 'login-validation') await doLogin();
        if (selectedState === 'login-error') {
          setInput('l-uid', 'unknown');
          setInput('l-pw', 'wrong-password');
          await doLogin();
        }
      } else if (selectedState === 'filtered-empty') {
        setInput('admin-search', '존재하지않는사용자');
        renderAdmin();
      } else if (selectedState === 'create-edit-validation') {
        openNewAcct();
        await registerAcct();
      } else if (selectedState === 'deactivate-reset-confirmation') {
        openDeact('kim.sales', false);
      } else if (selectedState === 'profile-password') {
        if (typeof openProfileModal === 'function') openProfileModal();
      }
    }
    await delay(120);
  }, {
    uxId: pageDefinition.uxId,
    navigateArgs: pageDefinition.navigate,
    after: pageDefinition.after || null,
    stateId,
  });
}

async function main() {
  assertSourceInputs();
  fs.mkdirSync(outputDir, { recursive: true });

  const fixture = makeFixture();
  const companyCiEvidenceFile = 'source-company-ci.png';
  fs.copyFileSync(path.join(prototypeDir, 'assets/images/ci.png'), path.join(outputDir, companyCiEvidenceFile));
  const prototypeFiles = listFiles(prototypeDir).map((relativePath) => ({
    path: relativePath,
    sha256: sha256File(path.join(prototypeDir, ...relativePath.split('/'))),
  }));
  const seedFiles = ['script/1.SQL script/sample_data.sql', 'script/sample_contracts.sql'].map((relativePath) => ({
    path: relativePath,
    sha256: sha256File(path.join(prototypeDir, ...relativePath.split('/'))),
  }));
  const fixtureJson = JSON.stringify(fixture);
  const fixtureSha256 = createHash('sha256').update(fixtureJson).digest('hex');
  const koreanFontDataUrl = `data:font/ttf;base64,${fs.readFileSync(koreanFontPath).toString('base64')}`;
  const { server, url } = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const runtimeErrors = [];
  const captures = [];

  page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(`console: ${message.text()}`);
  });
  await page.route(/^https?:\/\/(?!127\.0\.0\.1:).*/, async (route) => {
    await route.fulfill({ status: 200, contentType: 'text/javascript', body: '/* external dependency disabled by REF-01 offline capture */' });
  });
  await page.addInitScript(() => {
    const chain = new Proxy({}, {
      get(_target, property) {
        if (property === 'then') return (resolve) => resolve({ data: [], error: null });
        return () => chain;
      },
    });
    window.supabase = { createClient: () => chain };
    window.bcrypt = { compare: async () => true, hash: async (value) => value };
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof navigate === 'function' && document.querySelectorAll('[id^="page-"]').length >= 17);
    await page.addStyleTag({ content: `
      @font-face {
        font-family: "CRM REF Korean";
        src: url("/__crm_ref_korean_font.ttf") format("truetype");
        font-style: normal;
        font-weight: 100 900;
      }
      body { font-family: "CRM REF Korean", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important; }
    ` });
    await page.evaluate(() => document.fonts.ready);
    for (const pageDefinition of pages) {
      runtimeErrors.length = 0;
      await resetSourceRuntime(page, fixture);
      await prepareSourceState(page, pageDefinition, pageDefinition.normalState);
      const selector = `#page-${pageDefinition.sourcePage}`;
      await page.locator(selector).waitFor({ state: 'visible' });
      await page.waitForTimeout(150);

      if (runtimeErrors.length > 0) {
        throw new Error(`${pageDefinition.uxId} emitted runtime errors: ${unique(runtimeErrors).join('; ')}`);
      }

      const basename = `${pageDefinition.uxId.toLowerCase()}-${pageDefinition.sourcePage}`;
      const screenshot = `${basename}.png`;
      const domManifest = `${basename}.dom.json`;
      const stateManifest = `${basename}.states.json`;
      await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: false });
      const dom = await extractDomManifest(page, selector);
      fs.writeFileSync(path.join(outputDir, domManifest), `${JSON.stringify(dom, null, 2)}\n`);

      const states = [];
      for (const stateId of stateRequirements[pageDefinition.uxId]) {
        runtimeErrors.length = 0;
        await resetSourceRuntime(page, fixture);
        const printPopupPromise = pageDefinition.uxId === 'UX-03' && stateId === 'quote-print'
          ? context.waitForEvent('page')
          : null;
        await prepareSourceState(page, pageDefinition, stateId);
        const capturePage = printPopupPromise ? await printPopupPromise : page;
        if (capturePage !== page) {
          capturePage.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.message}`));
          capturePage.on('console', (message) => {
            if (message.type() === 'error') runtimeErrors.push(`console: ${message.text()}`);
          });
          await capturePage.waitForLoadState('domcontentloaded');
          await capturePage.setViewportSize(viewport);
          await capturePage.addStyleTag({ content: `
            @font-face {
              font-family: "CRM REF Korean";
              src: url("${koreanFontDataUrl}") format("truetype");
              font-style: normal;
              font-weight: 100 900;
            }
            body { font-family: "CRM REF Korean", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important; }
          ` });
          await capturePage.evaluate(() => document.fonts.ready);
        }
        const stateScreenshot = stateId === pageDefinition.normalState
          ? screenshot
          : pageDefinition.uxId === 'UX-17' && stateId === 'logged-out-login'
            ? 'ux-17-login.png'
            : `${basename}--${stateId}.png`;
        await capturePage.screenshot({ path: path.join(outputDir, stateScreenshot), fullPage: false });
        if (capturePage !== page) await capturePage.close();
        const expectedErrorState = stateId.endsWith('-error');
        if (runtimeErrors.length > 0 && !expectedErrorState) {
          throw new Error(`${pageDefinition.uxId}/${stateId} emitted runtime errors: ${unique(runtimeErrors).join('; ')}`);
        }
        states.push({
          name: stateId,
          captured: true,
          screenshot: stateScreenshot,
          screenshotSha256: sha256File(path.join(outputDir, stateScreenshot)),
          sourceOwnedSeedFiles: seedFiles,
          fixtureSha256,
          interactionVerified: true,
          notes: `source behavior state captured from ${pageDefinition.uxId === 'UX-03' && stateId.startsWith('quote-') ? 'app.quote.js' : sourceStateScripts[pageDefinition.sourcePage]}`,
        });
      }
      fs.writeFileSync(path.join(outputDir, stateManifest), `${JSON.stringify({
        states,
        requiredForTargetComparison: stateRequirements[pageDefinition.uxId].map((id) => ({
          id,
          behavior: id.replaceAll('-', ' '),
          sourceAnchors: ['index.html', pageDefinition.uxId === 'UX-03' && id.startsWith('quote-') ? 'app.quote.js' : sourceStateScripts[pageDefinition.sourcePage]],
        })),
      }, null, 2)}\n`);
      captures.push({
        uxId: pageDefinition.uxId,
        sourcePage: pageDefinition.sourcePage,
        viewport,
        screenshot,
        domManifest,
        stateManifest,
        captureCommand: 'pnpm run capture:crm-source-uiux',
        seedState: `source-owned SQL anchors + deterministic offline fixture ${fixtureSha256}`,
        capturedAt: new Date().toISOString(),
      });
      console.log(`captured ${pageDefinition.uxId} ${pageDefinition.sourcePage}`);
    }

    for (const capture of captures) {
      capture.evidenceSha256 = {
        screenshot: sha256File(path.join(outputDir, capture.screenshot)),
        domManifest: sha256File(path.join(outputDir, capture.domManifest)),
        stateManifest: sha256File(path.join(outputDir, capture.stateManifest)),
      };
    }

    const manifest = {
      version: 1,
      source: {
        prototypeDirectoryName: path.basename(prototypeDir),
        captureMode: 'offline-read-only',
        externalNetwork: 'blocked',
        captureFont: {
          family: 'CRM REF Korean',
          fileName: path.basename(koreanFontPath),
          sha256: sha256File(koreanFontPath),
          purpose: 'Linux Chromium Korean glyph fallback; source sizes and layout rules are unchanged',
        },
        seedFiles,
        fixtureSha256,
        companyCiEvidence: {
          fileName: companyCiEvidenceFile,
          sha256: sha256File(path.join(outputDir, companyCiEvidenceFile)),
          sourcePath: 'assets/images/ci.png',
        },
      },
      prototypeFiles,
      captures,
    };
    fs.writeFileSync(path.join(outputDir, 'source-uiux-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`wrote ${path.join(outputDir, 'source-uiux-manifest.json')}`);
  } finally {
    await browser.close();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

main().catch((error) => {
  console.error(`CRM source UI/UX capture failed: ${error.stack || error.message}`);
  process.exitCode = 1;
});
