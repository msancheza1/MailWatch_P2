export class DomainRule {
  private suspiciousTerms = [
    'login',
    'verify',
    'secure',
    'account',
    'bank',
    'update',
    'support',
    'paypal',
    'password',
  ];

  analyze(sender: string): string[] {
    const indicators: string[] = [];

    if (!sender) {
      return indicators;
    }

    const parts = sender.split('@');

    if (parts.length !== 2) {
      return indicators;
    }

    const username = parts[0].toLowerCase();

    const domain = parts[1].toLowerCase();

    const fullEmail = username + ' ' + domain;

    this.suspiciousTerms.forEach((term) => {
      if (fullEmail.includes(term)) {
        indicators.push(`Suspicious email term: ${term}`);
      }
    });

    const hyphens = (domain.match(/-/g) || []).length;

    if (hyphens >= 2) {
      indicators.push('Domain contains multiple hyphens');
    }

    return indicators;
  }
}
