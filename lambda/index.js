/* Skill "minhas tarefas" (Alexa-hosted, Node.js, pt-BR).
   Envia o que você disser para a caixa de entrada do app. O app busca e cria a tarefa.

   ANTES DE PUBLICAR, troque as duas linhas abaixo:
     API_URL  -> endereço do Worker da Cloudflare (sem barra no final)
     API_KEY  -> a MESMA chave que você colou no segredo APP_KEY da Cloudflare */
const API_URL = 'COLE_AQUI_O_ENDERECO_DO_WORKER';
const API_KEY = 'COLE_AQUI_A_CHAVE';

const Alexa = require('ask-sdk-core');
const https = require('https');

function enviar(texto) {
  return new Promise((resolve, reject) => {
    const u = new URL(API_URL + '/add');
    const body = JSON.stringify({ text: texto });
    const req = https.request({
      hostname: u.hostname, path: u.pathname, method: 'POST', timeout: 4000,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Authorization': 'Bearer ' + API_KEY,
      },
    }, res => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => (res.statusCode < 300 ? resolve(data) : reject(new Error(res.statusCode + ' ' + data))));
    });
    req.on('timeout', () => req.destroy(new Error('tempo esgotado')));
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const escolher = lista => lista[Math.floor(Math.random() * lista.length)];
const CONFIRMA = ['Pronto, adicionei', 'Feito, anotei', 'Certo, adicionei', 'Anotado:', 'Tudo bem, anotei', 'Beleza, adicionei'];

const LaunchHandler = {
  canHandle: h => Alexa.getRequestType(h.requestEnvelope) === 'LaunchRequest',
  handle: h => h.responseBuilder
    .speak('O que você quer adicionar? Por exemplo: adicionar comprar pão amanhã.')
    .reprompt('Diga, por exemplo: anotar ligar para o dentista.')
    .getResponse(),
};

const AddTaskHandler = {
  canHandle: h => Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest'
    && Alexa.getIntentName(h.requestEnvelope) === 'AddTaskIntent',
  async handle(h) {
    const texto = (Alexa.getSlotValue(h.requestEnvelope, 'tarefa') || '').trim();
    if (!texto) {
      return h.responseBuilder.speak('Não entendi o que anotar. Pode repetir?').reprompt('O que você quer adicionar?').getResponse();
    }
    try {
      await enviar(texto);
      return h.responseBuilder.speak(escolher(CONFIRMA) + ' ' + texto).withShouldEndSession(true).getResponse();
    } catch (e) {
      console.log('Erro ao enviar:', e.message);
      return h.responseBuilder.speak('Não consegui salvar agora. Tente de novo daqui a pouco.').getResponse();
    }
  },
};

const HelpHandler = {
  canHandle: h => Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest'
    && Alexa.getIntentName(h.requestEnvelope) === 'AMAZON.HelpIntent',
  handle: h => h.responseBuilder
    .speak('Você pode dizer: adicionar comprar pão, anotar pagar a conta, ou me lembre de ligar para o dentista amanhã. O que quer adicionar?')
    .reprompt('O que você quer adicionar?').getResponse(),
};

const StopHandler = {
  canHandle: h => Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest'
    && ['AMAZON.CancelIntent', 'AMAZON.StopIntent', 'AMAZON.NavigateHomeIntent'].includes(Alexa.getIntentName(h.requestEnvelope)),
  handle: h => h.responseBuilder.speak('Até logo!').withShouldEndSession(true).getResponse(),
};

const FallbackHandler = {
  canHandle: h => Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest'
    && Alexa.getIntentName(h.requestEnvelope) === 'AMAZON.FallbackIntent',
  handle: h => h.responseBuilder
    .speak('Não entendi. Diga, por exemplo: adicionar comprar pão.')
    .reprompt('O que você quer adicionar?').getResponse(),
};

const SessionEndedHandler = {
  canHandle: h => Alexa.getRequestType(h.requestEnvelope) === 'SessionEndedRequest',
  handle: h => h.responseBuilder.getResponse(),
};

const ErrorHandler = {
  canHandle: () => true,
  handle(h, error) {
    console.log('Erro:', error.message);
    return h.responseBuilder.speak('Desculpe, algo deu errado. Tente de novo.').getResponse();
  },
};

exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(LaunchHandler, AddTaskHandler, HelpHandler, StopHandler, FallbackHandler, SessionEndedHandler)
  .addErrorHandlers(ErrorHandler)
  .lambda();
