import { aws_certificatemanager as acm } from 'aws-cdk-lib';

/**
 * Custom domain name configuration for a CloudFront distribution.
 *
 * @beta
 */
export interface CustomDomainNameConfig {
  /** Custom domain name. */
  domainName: string;

  /** Certificate to protect the domain name. */
  certificate: acm.ICertificateRef;
}
