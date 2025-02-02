import axios from "axios";

let logWebHook = false;
let webHookURL = ''
let playersWebHookURL = ''
let chatWebHookURL = ''

var today = new Date();
var date = today.getFullYear()+'.'+(today.getMonth()+1)+'.'+today.getDate();
var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
var dateTime = date + ' ' + time;


export function sendToWebhook(webHookTitle, webHookContent, webHookValue, webHookColor) {
        let embeds = [
    {
        title: webHookTitle,
        color: webHookColor,
        footer: {
            text: dateTime,
        },
        fields: [
        {
            name: webHookContent,
            value: webHookValue
        },
        ],
    },
    ];

    let data = JSON.stringify({ embeds });

    var config = {
        method: "POST",
        url: webHookURL,
        headers: { "Content-Type": "application/json" },
        data: data,
    };
    axios(config)
        .then((response) => {
            if (logWebHook === true) {
                console.log("Webhook delivered successfully");
                return response;
            }
        })
        .catch((error) => {
            if (logWebHook === true) {
                console.log(error);
                return error;
            }
    });
}


export function sendToPlayers(webHookTitle, webHookContent, webHookValue, webHookColor) {
        let embeds = [
    {
        title: webHookTitle,
        color: webHookColor,
        footer: {
            text: dateTime,
        },
        fields: [
        {
            name: webHookContent,
            value: webHookValue
        },
        ],
    },
    ];

    let data = JSON.stringify({ embeds });

    var config = {
        method: "POST",
        url: playersWebHookURL,
        headers: { "Content-Type": "application/json" },
        data: data,
    };
    axios(config)
        .then((response) => {
            if (logWebHook === true) {
                console.log("Webhook delivered successfully");
                return response;
            }
        })
        .catch((error) => {
            if (logWebHook === true) {
                console.log(error);
                return error;
            }
    });
}



export function sendToChat(webHookTitle, webHookContent, webHookValue, webHookColor) {
        let embeds = [
    {
        title: webHookTitle,
        color: webHookColor,
        footer: {
            text: dateTime,
        },
        fields: [
        {
            name: webHookContent,
            value: webHookValue
        },
        ],
    },
    ];

    let data = JSON.stringify({ embeds });

    var config = {
        method: "POST",
        url: chatWebHookURL,
        headers: { "Content-Type": "application/json" },
        data: data,
    };
    axios(config)
        .then((response) => {
            if (logWebHook === true) {
                console.log("Webhook delivered successfully");
                return response;
            }
        })
        .catch((error) => {
            if (logWebHook === true) {
                console.log(error);
                return error;
            }
    });
}