import { getAzureEmbeddingProviderStatus } from './ai-azure-provider.js';

const ORIGINAL_ENV = { ...process.env };

function resetAzureEnv() {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.AZURE_OPENAI_ENDPOINT;
  delete process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT;
  delete process.env.AZURE_OPENAI_API_KEY;
  delete process.env.AZURE_USE_MANAGED_IDENTITY;
  delete process.env.AZURE_TENANT_ID;
  delete process.env.AZURE_CLIENT_ID;
  delete process.env.AZURE_CLIENT_SECRET;
  delete process.env.AZURE_MANAGED_IDENTITY_CLIENT_ID;
}

describe('Azure AI embedding provider readiness', () => {
  beforeEach(() => {
    resetAzureEnv();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('treats placeholder embedding deployment values as unavailable', () => {
    process.env.AZURE_OPENAI_ENDPOINT = 'https://example.openai.azure.com/';
    process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT = '<embedding-deployment>';
    process.env.AZURE_OPENAI_API_KEY = 'test-api-key';
    process.env.AZURE_USE_MANAGED_IDENTITY = 'false';

    const status = getAzureEmbeddingProviderStatus();

    expect(status.ready).toBe(false);
    expect(status.reasonCode).toBe('placeholder_embedding_deployment');
    expect(status.deploymentName).toBeUndefined();
  });

  it('reports ready only when a concrete deployment and credential are configured', () => {
    process.env.AZURE_OPENAI_ENDPOINT = 'https://example.openai.azure.com/';
    process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT = 'text-embedding-3-small';
    process.env.AZURE_OPENAI_API_KEY = 'test-api-key';
    process.env.AZURE_USE_MANAGED_IDENTITY = 'false';

    const status = getAzureEmbeddingProviderStatus('default');

    expect(status).toMatchObject({
      profileCode: 'default',
      providerCode: 'azure-openai',
      ready: true,
      deploymentName: 'text-embedding-3-small',
      credentialMode: 'api-key',
    });
  });
});
