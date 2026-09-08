export class UrlRule {
  private suspiciousTerms = [
    'login',
    'verify',
    'secure',
    'account',
    'update',
    'password',
    'bank',
    'paypal',
  ];

  analyze(content: string): string[] {
    const indicators: string[] = [];

    if (!content) {
      return indicators;
    }

    const urlRegex = /(https?:\/\/[^\s]+)/g;

    const urls = content.match(urlRegex);

    if (!urls) {
      return indicators;
    }

    urls.forEach((url) => {
      const lowerUrl = url.toLowerCase();

      this.suspiciousTerms.forEach((term) => {
        if (lowerUrl.includes(term)) {
          indicators.push(`Suspicious URL term: ${term}`);
        }
      });

      if (lowerUrl.startsWith('http://')) {
        indicators.push('URL uses insecure HTTP');
      }

      const hyphens = (lowerUrl.match(/-/g) || []).length;

      if (hyphens >= 2) {
        indicators.push('URL contains multiple hyphens');
      }
    });

    return indicators;
  }
}
