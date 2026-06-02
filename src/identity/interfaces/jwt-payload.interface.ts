export interface JwtPayload {
  sub: string;
  email: string;
  brandId: string;
  sid: string; // session ID — ties the access token to a specific session
}
