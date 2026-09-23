import React from 'react';
import './public-home.css';

const media = '/showcase/v1/';
const repository = 'https://github.com/thisisjorge/projeto-tita';

export const PublicHome: React.FC = () => (
  <div className="tita-public-home">
    <section className="tita-public-hero" aria-labelledby="public-home-title">
      <div className="tita-public-hero__copy">
        <span className="tita-public-eyebrow">PROJETO TITÃ · V1.0.0</span>
        <h1 id="public-home-title">Seu treino, seus dados, sua evolução.</h1>
        <p>
          Registre cada série, organize suas rotinas e acompanhe o progresso em um app que funciona
          offline. Sem conta para começar.
        </p>
        <div className="tita-public-actions">
          <a className="tita-public-button tita-public-button--primary" href="/app">
            Começar a treinar
          </a>
          <a className="tita-public-button tita-public-button--secondary" href={repository}>
            Ver no GitHub
          </a>
        </div>
        <span className="tita-public-caption">Web e PWA · Android para teste · Código aberto</span>
      </div>
      <img
        className="tita-public-hero__image"
        src={`${media}02-progresso-dark.png`}
        alt="Tela real de progresso do Titã com gráfico de cargas e recordes pessoais"
        width="1440"
        height="900"
      />
    </section>

    <div className="tita-public-stats" aria-label="Projeto Titã em números">
      <div>
        <strong>217</strong>
        <span>exercícios</span>
      </div>
      <div>
        <strong>215</strong>
        <span>animações</span>
      </div>
      <div>
        <strong>Offline</strong>
        <span>após o primeiro acesso</span>
      </div>
      <div>
        <strong>PWA + Android</strong>
        <span>APK de teste disponível</span>
      </div>
    </div>

    <section className="tita-public-section" aria-labelledby="public-how-title">
      <span className="tita-public-eyebrow">DO PRIMEIRO SET AO PRÓXIMO CICLO</span>
      <h2 id="public-how-title">Tudo o que importa no treino.</h2>
      <div className="tita-public-feature-grid">
        <article>
          <span>01</span>
          <h3>Treine com clareza</h3>
          <p>
            Carga, repetições, descanso e séries concluídas em uma sessão que pode ser retomada.
          </p>
        </article>
        <article>
          <span>02</span>
          <h3>Monte sua rotina</h3>
          <p>Crie, ajuste e reutilize fichas. Importe ou exporte seus programas quando precisar.</p>
        </article>
        <article>
          <span>03</span>
          <h3>Veja sua evolução</h3>
          <p>
            Histórico, volume, frequência, recordes e sugestões locais de progressão dão contexto ao
            próximo treino.
          </p>
        </article>
      </div>
    </section>

    <section
      className="tita-public-section tita-public-showcase"
      aria-labelledby="public-product-title"
    >
      <div className="tita-public-section-heading">
        <div>
          <span className="tita-public-eyebrow">O PRODUTO, EM USO</span>
          <h2 id="public-product-title">Da rotina ao resumo.</h2>
        </div>
        <p>Capturas da V1 em produção, com dados de demonstração em um perfil isolado.</p>
      </div>
      <div className="tita-public-showcase-grid">
        <figure className="tita-public-showcase-grid__wide">
          <img
            src={`${media}01-rotinas-dark.png`}
            alt="Rotinas organizadas no tema escuro"
            loading="lazy"
            width="1440"
            height="900"
          />
          <figcaption>Rotinas prontas para treinar</figcaption>
        </figure>
        <figure>
          <img
            src={`${media}04-treino-em-andamento-dark.png`}
            alt="Registro de séries, carga e repetições em um treino ativo"
            loading="lazy"
            width="390"
            height="844"
          />
          <figcaption>Registro durante o treino</figcaption>
        </figure>
        <figure>
          <img
            src={`${media}05-resumo-do-treino-dark.png`}
            alt="Resumo de um treino concluído"
            loading="lazy"
            width="390"
            height="844"
          />
          <figcaption>Resumo ao concluir</figcaption>
        </figure>
      </div>
    </section>

    <section
      className="tita-public-section tita-public-pair"
      aria-labelledby="public-library-title"
    >
      <div>
        <span className="tita-public-eyebrow">BIBLIOTECA DE EXERCÍCIOS</span>
        <h2 id="public-library-title">Encontre o movimento. Veja como ele acontece.</h2>
        <p>
          217 exercícios integrados ao catálogo, com busca por nome ou alias. 215 têm GIFs reais
          derivados de frames licenciados; dois usam fallback explícito.
        </p>
        <p className="tita-public-note">
          Mídia e atribuição:{' '}
          <a href={`${repository}/blob/main/public/media/ATTRIBUTION.md`}>ver créditos</a>.
        </p>
      </div>
      <img
        src={`${media}03-exercicio-animado-dark.png`}
        alt="Detalhe de exercício com animação licenciada"
        loading="lazy"
        width="390"
        height="844"
      />
    </section>

    <section
      className="tita-public-section tita-public-privacy"
      aria-labelledby="public-privacy-title"
    >
      <span className="tita-public-eyebrow">LOCAL PRIMEIRO</span>
      <h2 id="public-privacy-title">Seu histórico fica com você.</h2>
      <p>
        Treinos e rotinas ficam no armazenamento local do dispositivo. A PWA funciona offline após o
        primeiro carregamento; backup e restauração JSON ajudam você a levar seus dados. Limpar os
        dados do navegador pode apagar registros locais, então mantenha um backup.
      </p>
      <p>
        A ajuda com IA é opcional: BYOK, com prévia e confirmação antes de enviar dados a um
        provedor externo. O treino funciona sem ela.
      </p>
    </section>

    <section className="tita-public-section tita-public-final" aria-labelledby="public-start-title">
      <span className="tita-public-eyebrow">COMECE NO SEU RITMO</span>
      <h2 id="public-start-title">Seu próximo treino começa aqui.</h2>
      <div className="tita-public-actions">
        <a className="tita-public-button tita-public-button--primary" href="/app">
          Começar a treinar
        </a>
        <a
          className="tita-public-button tita-public-button--secondary"
          href={`${repository}/releases/tag/v1.0.0`}
        >
          Ver a V1.0.0
        </a>
      </div>
    </section>
  </div>
);
