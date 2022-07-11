const express = require('express');
const { Pool } = require('pg');
const crypto = require('crypto');
const paypal = require('paypal-rest-sdk');
const app = express();

require('dotenv').config();

paypal.configure({
  'mode': 'sandbox',
  'client_id': process.env.client_id,
  'client_secret': process.env.client_secret
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(express.json({ limit: "1mb" })); // parse incoming request to json

app.get("/", (req, res) => res.sendFile(__dirname + "/index.html"));

app.post("/api/generateApiKey", async (req, res) => {
  const create_payment_json = {
    "intent": "sale",
    "payer": {
        "payment_method": "paypal"
    },
    "redirect_urls": {
        "return_url": "https://localt-my-api.herokuapp.com/success",
        "cancel_url": "https://localt-my-api.herokuapp.com"
    },
    "transactions": [{
        "item_list": {
            "items": [{
                "name": "item",
                "sku": "item",
                "price": "1.00",
                "currency": "USD",
                "quantity": 1
            }]
        },
        "amount": {
            "currency": "USD",
            "total": "1.00"
        },
        "description": "This is the payment description."
    }]
  };

  paypal.payment.create(create_payment_json, (error, payment) => {
      if (error) {
          throw error;
      } else {
          for (let i = 0; i < payment.links.length; i++) {
              if (payment.links[i].rel === "approval_url") {
                  res.redirect(payment.links[i].href);
              }
          }
      }
  });
});

app.get("/api/validateKey/:apiKey", (req, res) => {
  const apiKey = req.params.apiKey;
  
  if (!apiKey) {
    res.sendStatus(400);
  }

  pool.connect().then(client => {
  const hashedApiKey = hashifyApiKey(apiKey);

    const text = "SELECT * FROM apiKeys WHERE apiKey = $1";
    const values = [hashedApiKey];

    client.query(text, values).then(result => {
      if (result.rowCount > 0) {
        res.json({
          validated: true
        });
      } else {
        res.sendStatus(404);
      }    
    });
    
  }).catch(err => {
    res.send(err);
  });
});

app.get("/success", (req, res) => {
  const payerId = req.query.PayerID;
  const paymentId = req.query.paymentId;

  const execute_payment_json = {
    payer_id: payerId,
    transactions: [
      {
        amount: {
          currency: "USD",
          total: "1.00",
        },
      },
    ],
  };

  paypal.payment.execute(paymentId, execute_payment_json, (error, payment) => {
    if (error) {
      console.log(error.response);
      throw error;
    } else {    
      generateApiKey((err, apiKey) => {
        if (err) {
          res.send(err);
        } else {
          res.redirect("https://localt-my-api.herokuapp.com/success.html?apiKey=" + apiKey);
        }
      });
    }
  });
});

function generateApiKey(cb) {
  pool.connect().then(client => {
    const buffer = crypto.randomBytes(32);
    const apiKey = buffer.toString("hex");
    const hashedApiKey = hashifyApiKey(apiKey);

    const text = "INSERT INTO apiKeys(apiKey) VALUES($1)";
    const values = [hashedApiKey];

    client.query(text, values).then(result => {
      if (result) {
        cb(null, apiKey);
      } else {
        generateApiKey(cb);
      }
  
      client.end();
    });
  }).catch(err => {
    cb(err);
  });
}

function hashifyApiKey(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

app.listen(PORT, () => console.log(`listening at ${PORT}`));