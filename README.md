# cs-greenway-vision-frontend

Frontend da plataforma **GreenWay Vision**, desenvolvida para auxiliar no monitoramento automatizado da vegetação em áreas rodoviárias por meio de visão computacional. Consome a API do repositório `cs-greenway-vision-backend`.

## Tecnologias

- **React** + **TypeScript**
- **Vite** — build e dev server
- **React Router** — navegação
- **Tailwind CSS** — estilização
- **Leaflet** (react-leaflet) — visualização de rodovias e trechos em mapa

## Telas

- **Upload** — cadastro de nova inspeção (rodovia, trecho, sentido, vídeo ou foto), com listagem das inspeções recentes e detalhe de frames classificados
- **Dashboard** — contagem de inspeções por criticidade (LOW/MEDIUM/HIGH)
- **Highways** — mapa das rodovias e trechos cadastrados
- **Segment Detail** — detalhe de um trecho específico
- **History** — histórico de inspeções
- **Settings** — configurações

## Integração com o backend

A comunicação é feita via `fetch`, configurável por `VITE_API_BASE_URL` (padrão `http://localhost:8000`). Todos os endpoints consumidos (`/roads`, `/segments`, `/inspections`) já existem e retornam dados reais do classificador treinado — não há dado mockado no frontend.

## Como rodar localmente

### Pré-requisitos

- Node.js 18 ou superior e npm
- Backend GreenWay Vision em execução. Por padrão, o frontend espera a API em `http://localhost:8000`.

### Instalação e execução

Na raiz deste repositório, instale as dependências e inicie o servidor de desenvolvimento:

```bash
npm install
npm run dev
```

Abra no navegador o endereço exibido no terminal (normalmente `http://localhost:5173`). O servidor atualiza a página automaticamente quando os arquivos são alterados.

Para apontar para uma API em outro endereço, crie um arquivo `.env.local` na raiz do projeto e informe a URL base:

```dotenv
VITE_API_BASE_URL=http://localhost:8000
```

Substitua o endereço pelo URL do backend e reinicie o servidor de desenvolvimento após alterar essa configuração. O backend deve estar acessível pelo navegador para que consultas e uploads funcionem.

Para validar a compilação de produção, execute `npm run build`. Para visualizar localmente o resultado compilado, execute `npm run preview`.

## Status

Totalmente integrado ao backend real. Upload de vídeo ou foto, consulta de inspeções e visualização de frames classificados funcionam ponta a ponta.

## Próximos passos

- Visualização de métricas do dispositivo de borda (câmera embarcada) quando esse componente for implementado — ver `docs`/README do backend para a especificação completa
- Ajustes de UX conforme feedback de uso
