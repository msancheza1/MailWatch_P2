/**
 * Reporte de calidad del detector. Se corre con `npm run evaluar`.
 *
 * Responde una sola pregunta: ¿la identificación está bien hecha? Para eso mide
 * la clasificación contra las etiquetas del dataset y lista, uno por uno, los
 * correos en los que se equivoca.
 */
import {
  FRAMING_LABEL,
  SENSITIVITY_PRESETS,
  analyzeBatch,
  evaluate,
  type Framing,
  type SensitivityPreset,
} from '../packages/core/src/index.js';
import { loadSimulatedEmails } from '../packages/fixtures/src/index.js';

const PRESET_LABEL: Record<SensitivityPreset, string> = {
  low: 'BAJA',
  balanced: 'MEDIA',
  high: 'ALTA',
};

const pct = (value: number) => `${(value * 100).toFixed(1)} %`;
const bold = (text: string) => `[1m${text}[0m`;
const dim = (text: string) => `[2m${text}[0m`;
const green = (text: string) => `[32m${text}[0m`;
const red = (text: string) => `[31m${text}[0m`;

const emails = loadSimulatedEmails();
const labelled = emails.filter((email) => email.groundTruth);
const counts = {
  safe: labelled.filter((e) => e.groundTruth === 'safe').length,
  suspicious: labelled.filter((e) => e.groundTruth === 'suspicious').length,
  malicious: labelled.filter((e) => e.groundTruth === 'malicious').length,
};

console.log(`\n${bold('MailWatch · calidad del detector')}`);
console.log(
  dim(
    `${labelled.length} correos etiquetados · ${counts.safe} seguros · ` +
      `${counts.suspicious} sospechosos · ${counts.malicious} maliciosos\n`,
  ),
);

let totalMistakes = 0;

for (const preset of ['low', 'balanced', 'high'] as const) {
  const thresholds = SENSITIVITY_PRESETS[preset];
  const results = analyzeBatch(emails, { thresholds });

  console.log(
    bold(`SENSIBILIDAD ${PRESET_LABEL[preset]}`) +
      dim(`  · umbrales ${thresholds.suspicious} / ${thresholds.malicious}`),
  );

  for (const framing of ['amenaza', 'malicioso'] as Framing[]) {
    const { matrix, metrics, mistakes } = evaluate(emails, results, framing);
    totalMistakes += preset === 'balanced' ? mistakes.length : 0;

    console.log(`\n  ${FRAMING_LABEL[framing]}`);
    console.log(
      `    detectadas        ${matrix.truePositives} de ${matrix.truePositives + matrix.falseNegatives}` +
        dim(`   (exhaustividad ${pct(metrics.recall)})`),
    );
    console.log(
      `    aciertos al marcar ${matrix.truePositives} de ${matrix.truePositives + matrix.falsePositives}` +
        dim(`   (precisión ${pct(metrics.precision)})`),
    );
    console.log(
      `    falsas alarmas    ${matrix.falsePositives} de ${matrix.trueNegatives + matrix.falsePositives} legítimos` +
        dim(`   (${pct(metrics.falseAlarmRate)})`),
    );
    console.log(dim(`    F1 ${metrics.f1.toFixed(3)}  ·  exactitud ${pct(metrics.accuracy)}`));

    if (mistakes.length === 0) {
      console.log(`    ${green('sin errores')}`);
      continue;
    }

    for (const mistake of mistakes) {
      const asunto = mistake.subject.length > 52 ? `${mistake.subject.slice(0, 52)}…` : mistake.subject;
      console.log(
        `    ${red(mistake.kind)} ${dim(mistake.emailId)} ` +
          `${dim(`[${mistake.expected} → ${mistake.got}, ${mistake.score}]`)} ${asunto}`,
      );
    }
  }

  console.log('');
}

console.log(
  totalMistakes === 0
    ? green('La sensibilidad Media clasifica correctamente todo el dataset.\n')
    : red(`La sensibilidad Media falla en ${totalMistakes} caso(s). Ver arriba.\n`),
);
