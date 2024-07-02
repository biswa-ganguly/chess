const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();
const server = http.createServer(app);

const io = socket(server);
const games = {};

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render("index", { title: "Chess Game" });
});

io.on("connection", (uniquesocket) => {
    console.log("New connection made");

    uniquesocket.on("joinRoom", (room) => {
        uniquesocket.join(room);
        if (!games[room]) {
            games[room] = {
                chess: new Chess(),
                players: {},
                currentPlayer: "w"
            };
        }
        const game = games[room];
        
        if (!game.players.white) {
            game.players.white = uniquesocket.id;
            uniquesocket.emit("playerRole", "w");
        } else if (!game.players.black) {
            game.players.black = uniquesocket.id;
            uniquesocket.emit("playerRole", "b");
        } else {
            uniquesocket.emit("spectatorRole");
        }

        io.to(room).emit("paired", game.players.white && game.players.black);

        uniquesocket.on("disconnect", () => {
            if (uniquesocket.id === game.players.white) {
                delete game.players.white;
            } else if (uniquesocket.id === game.players.black) {
                delete game.players.black;
            }
            io.to(room).emit("paired", game.players.white && game.players.black);
        });

        uniquesocket.on("move", (move) => {
            try {
                if (game.chess.turn() === "w" && uniquesocket.id !== game.players.white) return;
                if (game.chess.turn() === "b" && uniquesocket.id !== game.players.black) return;

                const result = game.chess.move(move);
                if (result) {
                    game.currentPlayer = game.chess.turn();
                    io.to(room).emit("move", move);
                    io.to(room).emit("boardState", game.chess.fen());
                } else {
                    console.log("Invalid move:", move);
                    uniquesocket.emit("InvalidMove", move);
                }

            } catch (err) {
                console.log(err);
                uniquesocket.emit("Invalid Move:", move);
            }
        });
    });
});

server.listen(3000, function () {
    console.log("Server is running on port 3000");
});
