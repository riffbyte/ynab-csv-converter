import { getVercelOidcToken } from '@vercel/oidc';
import { ExternalAccountClient } from 'google-auth-library';
import {
  GCP_PROJECT_NUMBER,
  GCP_SERVICE_ACCOUNT_EMAIL,
  GCP_WORKLOAD_IDENTITY_POOL_ID,
  GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID,
} from './constants';

export function getAuthClient() {
  // Initialize the External Account Client
  const authClient = ExternalAccountClient.fromJSON({
    type: 'external_account',
    audience: `//iam.googleapis.com/projects/${GCP_PROJECT_NUMBER}/locations/global/workloadIdentityPools/${GCP_WORKLOAD_IDENTITY_POOL_ID}/providers/${GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID}`,
    subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
    token_url: 'https://sts.googleapis.com/v1/token',
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${GCP_SERVICE_ACCOUNT_EMAIL}:generateAccessToken`,
    subject_token_supplier: {
      // Use the Vercel OIDC token as the subject token
      getSubjectToken: getVercelOidcToken,
    },
  });

  if (!authClient) {
    throw new Error('Failed to initialize auth client');
  }

  return authClient;
}
