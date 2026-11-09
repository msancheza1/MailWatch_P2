import { useCallback, useEffect, useState } from "react";

import {
  ChartNoAxesCombined,
  RefreshCw,
} from "lucide-react";

import { api } from "../api/axios";

interface Metrics {
  emailsAnalyzed: number;
  reviewedAnalyses: number;
  classificationErrors: number;
  precision: number | null;
}

interface ModelMetricsProps {
  refreshKey?: number;
  onAccessChange?: (allowed: boolean) => void;
}

export default function ModelMetrics({
  refreshKey = 0,
  onAccessChange,
}: ModelMetricsProps) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [reload, setReload] = useState(0);

  const requestReload = useCallback(() => {
    setLoading(true);
    setError("");
    setReload((current) => current + 1);
  }, []);

  useEffect(() => {
    let active = true;

    api
      .get<Metrics>("/dashboard/model-metrics")
      .then(({ data }) => {
        if (!active) {
          return;
        }

        setMetrics(data);
        setForbidden(false);
        setError("");
        onAccessChange?.(true);
      })
      .catch((cause: unknown) => {
        if (!active) {
          return;
        }

        const status = (
          cause as {
            response?: {
              status?: number;
            };
          }
        ).response?.status;

        setMetrics(null);
        setForbidden(status === 403);

        if (status === 403) {
          onAccessChange?.(false);
        } else {
          setError(
            "No se pudieron cargar las métricas. Inténtalo de nuevo.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [refreshKey, reload, onAccessChange]);

  if (forbidden) {
    return null;
  }

  function formatNumber(value: number) {
    return value.toLocaleString("es-CO", {
      maximumFractionDigits: 2,
    });
  }

  return (
    <section
      id="metricas"
      className="mw-panel mw-metrics"
      aria-labelledby="model-metrics-title"
      aria-busy={loading}
    >
      <div className="mw-section-heading">
        <div>
          <p className="mw-eyebrow">
            <ChartNoAxesCombined size={15} />
            EVALUACIÓN
          </p>

          <h2 id="model-metrics-title">
            Métricas del modelo
          </h2>

          <p className="mw-muted">
            Resultados de los análisis guardados y sus revisiones.
          </p>
        </div>

        <button
          type="button"
          className="mw-button mw-secondary"
          onClick={requestReload}
          disabled={loading}
        >
          <RefreshCw size={16} />
          {loading ? "Cargando…" : "Actualizar"}
        </button>
      </div>

      {loading && (
        <p role="status" className="mw-muted mw-space">
          Consultando métricas…
        </p>
      )}

      {error && (
        <p className="mw-message mw-error" role="alert">
          {error}
        </p>
      )}

      {metrics && !loading && (
        <>
          <div className="mw-metric-grid">
            <article className="mw-metric">
              <h3 className="mw-metric-label">
                Precisión al detectar maliciosos
              </h3>

              <strong className="mw-number-blue">
                {metrics.precision === null
                  ? "Sin datos"
                  : `${formatNumber(metrics.precision)} %`}
              </strong>

              <p>
                Sobre predicciones maliciosas revisadas.
              </p>
            </article>

            <article className="mw-metric">
              <h3 className="mw-metric-label">
                Errores de clasificación
              </h3>

              <strong className="mw-number-red">
                {formatNumber(metrics.classificationErrors)}
              </strong>

              <p>
                De {formatNumber(metrics.reviewedAnalyses)} análisis
                revisados.
              </p>
            </article>

            <article className="mw-metric">
              <h3 className="mw-metric-label">
                Correos analizados
              </h3>

              <strong className="mw-number-green">
                {formatNumber(metrics.emailsAnalyzed)}
              </strong>

              <p>
                Correos distintos con un análisis guardado.
              </p>
            </article>
          </div>

          <div className="mw-metric-note">
            {metrics.reviewedAnalyses === 0
              ? "Aún no hay revisiones humanas. Cero errores registrados no significa que el sistema no se equivoque."
              : `Los resultados de evaluación corresponden a ${formatNumber(
                  metrics.reviewedAnalyses,
                )} análisis revisados, no a todos los correos.`}
          </div>
        </>
      )}
    </section>
  );
}