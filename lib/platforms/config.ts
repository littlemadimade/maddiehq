export interface InstagramCredentials {
  appId: string;
  appSecret: string;
  initialToken?: string;
}

export interface RedditCredentials {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
}

export function getInstagramCredentials(): InstagramCredentials | null {
  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;

  if (!appId || !appSecret) {
    return null;
  }

  return {
    appId,
    appSecret,
    initialToken: process.env.INSTAGRAM_INITIAL_TOKEN || undefined
  };
}

export function getRedditCredentials(): RedditCredentials | null {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const username = process.env.REDDIT_USERNAME;
  const password = process.env.REDDIT_PASSWORD;

  if (!clientId || !clientSecret || !username || !password) {
    return null;
  }

  return { clientId, clientSecret, username, password };
}

export function requireInstagramCredentials(): InstagramCredentials {
  const creds = getInstagramCredentials();

  if (!creds) {
    throw new Error(
      "Missing Instagram credentials. Set INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET in .env.local. " +
      "See .env.example for details."
    );
  }

  return creds;
}

export function requireRedditCredentials(): RedditCredentials {
  const creds = getRedditCredentials();

  if (!creds) {
    throw new Error(
      "Missing Reddit credentials. Set REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, " +
      "and REDDIT_PASSWORD in .env.local. See .env.example for details."
    );
  }

  return creds;
}
