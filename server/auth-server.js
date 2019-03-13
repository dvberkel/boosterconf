const express    = require('express');
const bodyParser = require('body-parser');
const jwt = require("jsonwebtoken");
const uuid = require("uuid/v1");
const cors = require("cors");
const postmark = require("postmark");

const app = express();
app.use(cors());

const PORT = 8080;
const POSTMARK_API = "51d98136-0fa4-496f-8bce-a48fa0559104";

const users = [
  {id: 0, username: "adokukic", email: "ado@auth0.com"}
];

var magicLinks = {};

app.use(bodyParser.json());

app.post("/authorize", (req, res) => {
  //No email in request body, return 400
  if (!req.body.email) return res.status(400).send("Need email");

  //Find a user in the DB
  const user = users.find(function(u) {
    return u.email === req.body.email;
  });
  if (!user) return res.status(401).send("User not found");

  //Check for a callback
  let callback = req.body.callback;
  if (callback.substr(-1) === "?") callback = callback.substr(0, callback.length-1);
  if (callback.substr(-1) === "#") callback = callback.substr(0, callback.length-1);
  if (callback.substr(-1) === "/") callback = callback.substr(0, callback.length-1);

  //Create a magic link
  let magicLink = uuid();
  magicLinks[magicLink] = {user, callback};

  //Magic link expires in 30 seconds
  //setTimeout(()=>{magicLinks[magicLink] = undefined;}, 30000);

  // Email the magic link
  const emailData = {
    From: "Ado Kukic <ado@auth0.com>",
    To: user.email,
    Subject: "Your Magic Link",
    TextBody: `🧙‍️ http://localhost:${PORT}/login/${magicLink}`
  };


  // Send an email:
  const client = new postmark.Client(POSTMARK_API);
  console.log("User found.  Sending Magic Link by email.", `🧙‍️ http://localhost:${PORT}/login/${magicLink}`);
  client.sendEmail(emailData).then(() => {console.log("Email sent")}).catch(e=>console.log(e));

  //All is good, send back a 200
  res.send("Magic Link Sent!").status(200);
});

app.get("/login/:magicLink", (req, res) => {
  console.log("Validate Magic Link");
  //Get the magic link id
  const magicLink = magicLinks[req.params.magicLink];

  //Single use, destroy the magicLink
  //magicLinks[req.params.magicLink] = undefined;

  //No match found for magic link, return 401
  if (!magicLink) return res.status(400).send("<img src='http://http.cat/400'>");

  //Create a token
  const token = jwt.sign({
    sub: magicLink.user.id,
    scope: "api:read",
    username: magicLink.user.username,
    email: magicLink.user.email
  }, "mysupersecret", {expiresIn: "10 minutes"});

  //Redirect to the matching callback with the token
  const redirectUrl = `${magicLink.callback}/#access_token=${token}`;
  console.log("Redirecting user to " + redirectUrl);
  res.redirect(redirectUrl);
});

app.get('*', function (req, res) {
  res.sendStatus(404);
});

app.listen(PORT, () => console.log("Passwordless auth server started on port 8080"));
