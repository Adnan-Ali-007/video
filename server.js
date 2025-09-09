const WebSocketServer = require("websocket").server;
const http = require("http");
const express = require("express");
const path = require("path");
const app = express();
// Serve static files
app.use(express.static(__dirname));  // For style.css in root
app.use('/sender', express.static(path.join(__dirname, 'sender')));  // Serve sender folder at /sender
app.use('/receiver', express.static(path.join(__dirname, 'receiver')));  // Serve receiver folder at /receiver
app.use((req, res) => {
  res.status(404).send();
});
const server = http.createServer(app);
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});
// Attach WebSocket server to the HTTP server
const webSocket = new WebSocketServer({
  httpServer: server
});
let users = []

webSocket.on("request", (req) => {
  const connection = req.accept()

  connection.on("message", (message) => {
    const data = JSON.parse(message.utf8Data)
    const user = findUser(data.username)

    switch (data.type) {
      case "store_user":
        if (user) return
        const newUser = { conn: connection, username: data.username }
        users.push(newUser)
        console.log("User :", newUser.username)
        break

      case "store_offer":
        if (!user) return
        user.offer = data.offer
        break

      case "store_candidate":
        if (!user) return
        if (!user.candidates) user.candidates = []
        user.candidates.push(data.candidate)
        break

      case "send_answer":
        if (!user) return
        sendData({ type: "answer", answer: data.answer }, user.conn)
        break

      case "send_candidate":
        if (!user) return
        sendData({ type: "candidate", candidate: data.candidate }, user.conn)
        break

      case "join_call":
        if (!user) return
        sendData({ type: "offer", offer: user.offer }, connection)
        user.candidates.forEach((candidate) => {
          sendData({ type: "candidate", candidate }, connection)
        })
        break
    }
  })

  connection.on("close", () => {
    users = users.filter((u) => u.conn !== connection)
  })
})

function sendData(data, conn) {
  conn.send(JSON.stringify(data))
}

function findUser(username) {
  return users.find((u) => u.username === username)
}
