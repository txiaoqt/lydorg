import { writeFile } from 'node:fs/promises';
import { sha256File, runQuiet, privateToolErrorCode, privateToolDiagnostic } from './common.mjs';

export const SERVICE_CODE_PATTERN = /^[A-Za-z][A-Za-z0-9]{0,63}$/;

export const SAFE_R2_ERROR_CODES = Object.freeze([
  'access_denied',
  'invalid_access_key',
  'signature_mismatch',
  'bucket_not_found',
  'endpoint_unreachable',
  'invalid_argument',
  'invalid_endpoint',
  'ssl_error',
  'credentials_error',
  'redirect_or_region_error',
  'malformed_response',
  'aws_service_error',
]);

export function extractAwsServiceCode(stderr) {
  if (typeof stderr !== 'string') return null;
  const match = stderr.match(/An error occurred \(([^)]+)\)/i) ||
                stderr.match(/<Code>([^<]+)<\/Code>/i);
  if (!match) return null;
  const candidate = match[1].trim();
  if (SERVICE_CODE_PATTERN.test(candidate)) {
    return candidate;
  }
  return null;
}

export function extractHttpStatus(stderr) {
  if (typeof stderr !== 'string') return null;
  const opStatusMatch = stderr.match(/operation\s*\((?:HTTP\s*)?([1-5]\d{2})\)/i);
  if (opStatusMatch) return Number(opStatusMatch[1]);

  const errParenMatch = stderr.match(/An error occurred \(([1-5]\d{2})\)/i);
  if (errParenMatch) return Number(errParenMatch[1]);

  const httpMatch = stderr.match(/\b(?:HTTP|status code|status)\s*[:=]?\s*([1-5]\d{2})\b/i);
  if (httpMatch) return Number(httpMatch[1]);

  const phraseMatch = stderr.match(/\b([1-5]\d{2})\s+(?:Bad Request|Unauthorized|Forbidden|Not Found|Method Not Allowed|Internal Server Error|Bad Gateway|Service Unavailable|Gateway Timeout)\b/i);
  if (phraseMatch) return Number(phraseMatch[1]);

  return null;
}

export function classifyR2Diagnostic(diagnostic) {
  const output = String(diagnostic ?? '').toLowerCase();
  const serviceCode = extractAwsServiceCode(diagnostic);
  const httpStatus = extractHttpStatus(diagnostic);

  let code = 'unknown_r2_error';

  // If an AWS service error code was returned in "An error occurred (<Code>)"
  // check if it maps to a specific known category:
  if (serviceCode === 'AccessDenied') {
    code = 'access_denied';
  } else if (serviceCode === 'InvalidAccessKeyId') {
    code = 'invalid_access_key';
  } else if (serviceCode === 'SignatureDoesNotMatch') {
    code = 'signature_mismatch';
  } else if (serviceCode === 'NoSuchBucket') {
    code = 'bucket_not_found';
  } else if (['AuthorizationHeaderMalformed', 'PermanentRedirect', 'IllegalLocationConstraintException'].includes(serviceCode)) {
    code = 'redirect_or_region_error';
  } else if (['InvalidToken', 'ExpiredToken'].includes(serviceCode)) {
    code = 'credentials_error';
  } else if (['ResponseParsingError', 'MalformedXML'].includes(serviceCode)) {
    code = 'malformed_response';
  } else if (serviceCode) {
    // Unrecognized AWS service code (e.g. InvalidRequest, InvalidArgument, SlowDown, MethodNotAllowed)
    code = 'aws_service_error';
  } else {
    // Client-side CLI or network/TLS errors where no service code exists
    if (/paramvalidationerror|parameter validation failed|unknown argument|unknown option|invalid choice|argument --|the following arguments are required|unrecognized argument|usage:\s*aws/.test(output)) {
      code = 'invalid_argument';
    } else if (/endpointresolutionerror|could not resolve endpoint|invalid endpoint|invalid url|failed to parse endpoint|invalid scheme/.test(output)) {
      code = 'invalid_endpoint';
    } else if (/certificate_verify_failed|certificate verify failed|sslvalidationfailed|\bsslerror\b|ssl error|self signed certificate|unable to get local issuer certificate|ssl handshake|tls handshake|certificateverificationerror|tlsv1_alert/.test(output)) {
      code = 'ssl_error';
    } else if (/invalidaccesskeyid|invalid access key|access key id.{0,30}invalid|access key id you provided does not exist/.test(output)) {
      code = 'invalid_access_key';
    } else if (/signaturedoesnotmatch|signature mismatch|signature does not match|request signature.{0,30}does not match/.test(output)) {
      code = 'signature_mismatch';
    } else if (/unable to locate credentials|nocredentialserror|partialcredentialserror|credentialretrievalerror|credentials could not be loaded|invalid credentials|security token.{0,30}(?:invalid|expired)|invalidtoken|expiredtoken|tokenrefresherror|missing credentials/.test(output)) {
      code = 'credentials_error';
    } else if (/authorizationheadermalformed|permanentredirect|illegallocationconstraintexception|locationconstraint|region.{0,30}(?:wrong|invalid|mismatch|expecting)|specify a region|regionresolutionerror|send all future requests to this (?:address|endpoint)|\b301\b|\b307\b/.test(output)) {
      code = 'redirect_or_region_error';
    } else if (/nosuchbucket|no such bucket|bucket.{0,30}not found|bucket does not exist/.test(output)) {
      code = 'bucket_not_found';
    } else if (/accessdenied|access denied|\bforbidden\b|\b403\b|\bunauthorized\b|\b401\b|not authorized/.test(output)) {
      code = 'access_denied';
    } else if (/endpointconnectionerror|could not connect|connect timeout|connection (?:timed out|refused|reset)|name or service not known|temporary failure in name resolution|network is unreachable|host is unreachable|no route to host|failed to establish a new connection|newconnectionerror|max retries exceeded with url/.test(output)) {
      code = 'endpoint_unreachable';
    } else if (/responseparsingerror|responseparsererror|unable to parse response|xmlsyntaxerror|malformedxml|invalid xml|bad gateway|\b502\b|service unavailable|\b503\b|gateway timeout|\b504\b|internalerror|internal server error|\b500\b|\b520\b|\b521\b|\b522\b|\b524\b|invalid r2 list response/.test(output)) {
      code = 'malformed_response';
    }
  }

  const result = { code };
  if (serviceCode) result.serviceCode = serviceCode;
  if (httpStatus) result.httpStatus = httpStatus;

  Object.defineProperty(result, 'toString', {
    value: () => code,
    enumerable: false,
  });

  return result;
}

export function formatR2Diagnostic(diagnostic, phase = 'R2 check failed') {
  const code = (typeof diagnostic === 'string' ? diagnostic : diagnostic?.code) || 'unknown_r2_error';
  const lines = [`${phase}: ${code}`];
  if (code === 'aws_service_error' && diagnostic?.serviceCode) {
    lines.push(`service_code: ${diagnostic.serviceCode}`);
    if (diagnostic.httpStatus) {
      lines.push(`http_status: ${diagnostic.httpStatus}`);
    }
  }
  return lines.join('\n');
}

export function getR2Diagnostic(error, getDiagnostic = privateToolDiagnostic, getErrorCode = privateToolErrorCode) {
  const toolDiag = typeof getDiagnostic === 'function' ? getDiagnostic(error) : null;
  const rawCode = typeof getErrorCode === 'function' ? getErrorCode(error) : '';
  const fallbackCode = typeof rawCode === 'object' && rawCode ? rawCode.code : rawCode;
  const code = toolDiag?.code || (fallbackCode && SAFE_R2_ERROR_CODES.includes(fallbackCode) ? fallbackCode : classifyR2Error(error, getErrorCode));
  const result = { code };
  if (toolDiag?.serviceCode) result.serviceCode = toolDiag.serviceCode;
  if (toolDiag?.httpStatus) result.httpStatus = toolDiag.httpStatus;
  if (!result.serviceCode && typeof error?.serviceCode === 'string' && SERVICE_CODE_PATTERN.test(error.serviceCode)) {
    result.serviceCode = error.serviceCode;
  }
  if (!result.httpStatus && typeof error?.httpStatus === 'number' && Number.isInteger(error.httpStatus)) {
    result.httpStatus = error.httpStatus;
  }
  return result;
}

export function classifyR2Error(error, getErrorCode = privateToolErrorCode) {
  const rawCode = typeof getErrorCode === 'function' ? getErrorCode(error) : '';
  const code = typeof rawCode === 'object' && rawCode ? rawCode.code : rawCode;
  if (SAFE_R2_ERROR_CODES.includes(code)) return code;
  if (error && SAFE_R2_ERROR_CODES.includes(error.code)) return error.code;
  if (typeof error?.message === 'string') {
    const match = error.message.match(/(?:R2 check failed|R2 preflight failed|R2 destination check failed):\s*([a-z_]+)/);
    if (match && SAFE_R2_ERROR_CODES.includes(match[1])) return match[1];
  }
  if (error instanceof SyntaxError || error?.message?.includes('invalid R2 list response')) {
    return 'malformed_response';
  }
  return 'unknown_r2_error';
}

function destinationPrefix(backupId, createdAtUtc) {
  const date = createdAtUtc.slice(0, 10).replaceAll('-', '/');
  return `manual/${date}/${backupId}/`;
}

export async function assertDestinationListable({
  env,
  prefix,
  execute = runQuiet,
  getErrorCode = privateToolErrorCode,
  getDiagnostic = privateToolDiagnostic,
  phase = 'R2 preflight failed',
}) {
  const awsEnv = { ...process.env, AWS_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION: 'auto',
    AWS_EC2_METADATA_DISABLED: 'true', AWS_PAGER: '', AWS_RETRY_MODE: 'standard', AWS_MAX_ATTEMPTS: '3',
    AWS_REQUEST_CHECKSUM_CALCULATION: 'WHEN_REQUIRED', AWS_RESPONSE_CHECKSUM_VALIDATION: 'WHEN_REQUIRED',
    AWS_SESSION_TOKEN: '', AWS_PROFILE: '', AWS_CONFIG_FILE: '/dev/null', AWS_SHARED_CREDENTIALS_FILE: '/dev/null' };
  const args = [
    '--endpoint-url', env.R2_ENDPOINT,
    '--region', 'auto',
    's3api', 'list-objects-v2',
    '--bucket', env.R2_BUCKET_NAME,
    ...(prefix !== undefined ? ['--prefix', prefix] : []),
    '--max-keys', '1',
    '--output', 'json',
  ];
  try {
    const output = await execute('aws', args, awsEnv, true, classifyR2Diagnostic);
    const result = JSON.parse(output);
    if (!Number.isSafeInteger(result.KeyCount) || result.KeyCount < 0 ||
        (result.Contents !== undefined && !Array.isArray(result.Contents))) throw new Error('invalid R2 list response');
    return result;
  } catch (error) {
    const diag = getR2Diagnostic(error, getDiagnostic, getErrorCode);
    const message = formatR2Diagnostic(diag, phase);
    const err = new Error(message);
    err.code = diag.code;
    if (diag.serviceCode) err.serviceCode = diag.serviceCode;
    if (diag.httpStatus) err.httpStatus = diag.httpStatus;
    throw err;
  }
}

/** Check endpoint and bucket list access before the potentially expensive archive packaging step. */
export async function preflightR2({ backupId, createdAtUtc, env, execute = runQuiet, getErrorCode = privateToolErrorCode }) {
  const prefix = destinationPrefix(backupId, createdAtUtc);
  const existing = await assertDestinationListable({ env, prefix, execute, getErrorCode, phase: 'R2 preflight failed' });
  if (existing.KeyCount !== 0 || existing.IsTruncated === true || existing.Contents?.length) {
    throw new Error('R2 backup prefix already exists; refusing to overwrite');
  }
  return { prefix, bucketListVerified: true };
}

export async function uploadR2({ archive, backupId, createdAtUtc, env, execute = runQuiet, getErrorCode = privateToolErrorCode }) {
  const hash = await sha256File(archive);
  const prefix = destinationPrefix(backupId, createdAtUtc);
  const archiveName = `ytrace-backup-${backupId}.tar.gz`;
  const key = `${prefix}${archiveName}`;
  const awsEnv = { ...process.env, AWS_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION: 'auto',
    AWS_EC2_METADATA_DISABLED: 'true', AWS_PAGER: '', AWS_RETRY_MODE: 'standard', AWS_MAX_ATTEMPTS: '3',
    AWS_REQUEST_CHECKSUM_CALCULATION: 'WHEN_REQUIRED', AWS_RESPONSE_CHECKSUM_VALIDATION: 'WHEN_REQUIRED',
    AWS_SESSION_TOKEN: '', AWS_PROFILE: '', AWS_CONFIG_FILE: '/dev/null', AWS_SHARED_CREDENTIALS_FILE: '/dev/null' };
  const aws = (args, capture = false) => execute('aws', ['--endpoint-url', env.R2_ENDPOINT, '--region', 'auto', ...args], awsEnv, capture, classifyR2Diagnostic);
  const existing = await assertDestinationListable({ env, prefix, execute, getErrorCode, phase: 'R2 destination check failed' });
  if (existing.KeyCount !== 0 || existing.IsTruncated === true || existing.Contents?.length) throw new Error('Backup prefix already exists; refusing to overwrite');
  await aws(['s3', 'cp', archive, `s3://${env.R2_BUCKET_NAME}/${key}`, '--only-show-errors',
    '--content-type', 'application/gzip', '--metadata', `sha256=${hash.sha256}`]);
  const checksumFile = `${archive}.sha256`;
  await writeFile(checksumFile, `${hash.sha256}  ${archiveName}\n`, { flag: 'wx', mode: 0o600 });
  await aws(['s3', 'cp', checksumFile, `s3://${env.R2_BUCKET_NAME}/${key}.sha256`, '--only-show-errors', '--content-type', 'text/plain']);
  let head;
  try { head = JSON.parse(await aws(['s3api', 'head-object', '--bucket', env.R2_BUCKET_NAME, '--key', key, '--output', 'json'], true)); }
  catch { throw new Error('R2 archive HEAD verification failed'); }
  if (head.ContentLength !== hash.size || head.Metadata?.sha256 !== hash.sha256) throw new Error('R2 archive size/checksum metadata mismatch');
  const sidecar = JSON.parse(await aws(['s3api', 'head-object', '--bucket', env.R2_BUCKET_NAME, '--key', `${key}.sha256`, '--output', 'json'], true));
  const localSidecar = await sha256File(checksumFile);
  if (sidecar.ContentLength !== localSidecar.size) throw new Error('R2 checksum sidecar size mismatch');
  // R2 ETags are not SHA-256 (especially for multipart uploads). Metadata alone is not a byte verification.
  const readback = `${archive}.readback`;
  await aws(['s3', 'cp', `s3://${env.R2_BUCKET_NAME}/${key}`, readback, '--only-show-errors']);
  const remoteHash = await sha256File(readback);
  if (remoteHash.size !== hash.size || remoteHash.sha256 !== hash.sha256) throw new Error('R2 read-back archive checksum mismatch');
  return { key, size: hash.size, sha256: hash.sha256, readBackVerified: true };
}
