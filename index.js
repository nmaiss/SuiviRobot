const { Telegraf, Markup, Context, session, Stage, WizardScene, Scenes } = require("telegraf");
const { Keyboard, Key } = require('telegram-keyboard')
const { CallbackData } = require('telegraf-callback-data');

const mongoose = require('mongoose');

require('dotenv').config();
mongoose.connect(process.env.MONGO);

const request = require('request');
var dateFormat = require('dateformat');

const savingData = new CallbackData(
  'saving',
  ['user_id', 'number']
);

const bot = new Telegraf(process.env.TOKEN);
const Schema = mongoose.Schema;
userSchema = new Schema({
  id: String,
  first_name: String,
  last_name: String,
});

trackingSchema = new Schema({
  id: String,
  number: String,
  name: String,
  creator: String,
  notify: Boolean,
});

User = mongoose.model('User', userSchema)
Tracking = mongoose.model('Tracking', trackingSchema)

var currentID, callbackData, currentNotitfy = true;

var setTrackingName = new Scenes.WizardScene(
  "setTrackingName",
  async (ctx) => {
    await ctx.reply("Parfait ! Comment souhaitez vous nommer ce suivi ?").catch(error => showError(error, ctx));
    return await ctx.wizard.next()
  },
  async (ctx) => {
    if (!ctx.message){
      return ;
    }
    const newTracking = new Tracking({
      number: currentID,
      name: ctx.message.text,
      creator: ctx.chat.id,
      notify: currentNotitfy,
    });
    await newTracking.save();
    await ctx.reply("Le numéro de suivi a été enregistré. Vous serez notifié de son statut directement ici.").catch(error => showError(error, ctx))

    return await ctx.scene.leave().catch(error => functions.error(error, ctx));
  },
);

stage = new Scenes.Stage()

stage.register(setTrackingName);

bot.use(session());
bot.use(stage.middleware());

async function showError(err, ctx){
  console.log(err)
  await bot.telegram.sendMessage(
    ctx.chat.id,
    err
  ).catch(error => console.log(error))
}

setInterval(async function () {
  await Tracking.find({}, async function(err, trackings){
    if (err){
      await functions.error(err, ctx)
    } else{
      await trackings.forEach( async (item, i) => {
        if (item.notify){
          var nuuuu = item.number;
          let url='https://api.laposte.fr/suivi/v2/idships/' + nuuuu;
          if (nuuuu[0] == '/'){
            showingKeyboard = false
            var nuu2 = nuuuu.substring(1, nuuuu.length)
            url='https://api.laposte.fr/suivi/v2/idships/' + nuu2;
          }
          await request({
              url: url,
              method: 'GET',
              headers: {
                'Accept' : 'application/json',
                'X-Okapi-Key': process.env.POSTE
              }
          }, async function (error, response, body) {
              if (error) throw error;
              if (JSON.parse(body).returnCode != 200){
                console.log(JSON.parse(body).returnMessage)
              }
              else{
                const data = JSON.parse(body)
                const shipmentData = data.shipment

                let message = "<b>" + shipmentData.product + "</b> (" + "<a href='" + shipmentData.url + "'>" +shipmentData.idShip + "</a>) ✅"

                if (shipmentData.isFinal){
                  trackings[i].notify = false;
                  trackings[i].save();
                  await bot.telegram.sendMessage(
                    item.creator,
                    message,
                    {
                      parse_mode: 'HTML',
                      disable_web_page_preview: true,
                    },
                  ).catch(error => functions.error(error, ctx)) 
                }
              }
          });
        }
      });
    }
  }) 
}, 1 * 60 * 60 * 1000); // 1 hour

bot.command('start', async ctx => {
  await User.find({ id: ctx.chat.id}, async function (err, docs) {
    if (err){
      await showError(err, ctx)
    }
    else {
      await bot.telegram.sendMessage(
        ctx.chat.id,
        "Salut, envoie-moi le numéro de l'envoi pour être notifié de son statut.\n\n/suivis – Pour voir les numéros enregistrés"
      ).catch(error => showError(error, ctx))
    }
  });
});

bot.command('suivis', async ctx => {
  await Tracking.find({creator: ctx.chat.id}, async function(err, trackings){
    if (err){
      await functions.error(err, ctx)
    } else{
      let trackingsMessage;
      if (trackings.length == 0){
        trackingsMessage = "Vous n'avez pas de numéro enregistré.";
      }
      else{
        trackingsMessage = "Vos numéros enregistrés. Utilisez la commande à côté du nom pour les afficher :" + "\n"
      }
      await trackings.forEach((item, i) => {
        trackingsMessage += '\n' + trackings[i].name + " – /" + trackings[i].number
      });

      await bot.telegram.sendMessage(
        ctx.chat.id,
        trackingsMessage,
      ).catch(error => functions.error(error, ctx))
    }
  })
});

bot.on('text', async (ctx) => {
  var showingKeyboard = true
  var nuuuu = await ctx.message.text
  let url='https://api.laposte.fr/suivi/v2/idships/' + nuuuu;
  if (nuuuu[0] == '/'){
    showingKeyboard = false
    var nuu2 = nuuuu.substring(1, nuuuu.length)
    url='https://api.laposte.fr/suivi/v2/idships/' + nuu2;
  }
  await request({
      url: url,
      method: 'GET',
      headers: {
         'Accept' : 'application/json',
         'X-Okapi-Key': process.env.POSTE
      }
  }, async function (error, response, body) {
      if (error) throw error;
      if (JSON.parse(body).returnCode != 200){
        await bot.telegram.sendMessage(
          ctx.chat.id,
          JSON.parse(body).returnMessage,
        ).catch(er2 => showError(er2, ctx));
      }
      else{
        const data = await JSON.parse(body)
        const shipmentData = data.shipment


        let message = "<b>" + shipmentData.product + "</b> (" + "<a href='" + shipmentData.url + "'>" +shipmentData.idShip + "</a>) ";
        if (shipmentData.isFinal){
          currentNotitfy = false;
          message += "✅"
        }
        else{
          currentNotitfy = true;
          message += "🕐"
        }
        message += "\n\n";
        const timeline = await shipmentData.timeline
        await timeline.forEach((item, i) => {
          if (item.status){
            message += "<b>" + item.shortLabel + "</b>"
          }
          else{
            message += item.shortLabel
          }
          if (item.date){
            var day = dateFormat(item.date, "dd/mm");
            message += "<b> le " + day + "</b>"
          }
          if (item.longLabel.length > 0){
            message += " (" + item.longLabel + ")";
          }
          message += "\n";
        });

        callbackData = savingData.create({
          user_id: ctx.chat.id,
          number: shipmentData.idShip
        })

        if (showingKeyboard){
          await bot.telegram.sendMessage(
            ctx.chat.id,
            message,
            {
              parse_mode: 'HTML',
              disable_web_page_preview: true,
              "reply_markup":
              {
                "inline_keyboard": [
                  [
                    {"text": "Enregistrer", "callback_data": callbackData, "hide": false},
                  ],
                ]
              },
            },
          ).catch(err3 => showError(err3, ctx));
        }
        else{
          await bot.telegram.sendMessage(
            ctx.chat.id,
            message,
            {
              parse_mode: 'HTML',
              disable_web_page_preview: true,
            },
          ).catch(error => showError(error, ctx));
        }
      }
  });

});

bot.action(
  savingData.filter(),
  async (ctx) => {
    currentID = await savingData.parse(callbackData).number
    await ctx.scene.enter("setTrackingName");
  }
);

bot.launch()
