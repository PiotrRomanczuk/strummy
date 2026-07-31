export const getAppConfig = () => {
  const localApiUrl = process.env.NEXT_PUBLIC_API_BASE_URL_LOCAL;
  const remoteApiUrl = process.env.NEXT_PUBLIC_API_BASE_URL_REMOTE;
  const legacyApiUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  // Determine if we are in a local environment
  // We can infer this from NODE_ENV or if the local Supabase URL is set and being used
  const isLocal = process.env.NODE_ENV === 'development' || !!process.env.NEXT_PUBLIC_SUPABASE_LOCAL_URL;

  let apiUrl = legacyApiUrl;

  if (isLocal && localApiUrl) {
    apiUrl = localApiUrl;
  } else if (!isLocal && remoteApiUrl) {
    apiUrl = remoteApiUrl;
  }

  // Ensure trailing slash
  if (apiUrl && !apiUrl.endsWith('/')) {
    apiUrl = `${apiUrl}/`;
  }

  return {
    apiUrl,
  };
};
