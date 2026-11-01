const express = require("express");
const http = require("http");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

const storage = multer.diskStorage({

    destination:(req,file,cb)=>{

        cb(null,"uploads");

    },

    filename:(req,file,cb)=>{

        cb(
            null,
            Date.now() +
            "-" +
            file.originalname
        );

    }

});

const upload = multer({
    storage
});

app.post(
"/upload",
upload.single("file"),
(req,res)=>{

    res.json({
        filename:req.file.filename
    });

});

const STARTING_MONEY = 10000;
const DATA_FILE = "players.json";

let playerData = {};

if(fs.existsSync(DATA_FILE)){

    try{

        playerData = JSON.parse(
            fs.readFileSync(DATA_FILE)
        );

    }catch{

        playerData = {};

    }

}

function savePlayers(){

    fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(
            playerData,
            null,
            4
        )
    );

}

const shop = {

    "DOM1":65000,
    "DOM2":85000,
    "DOM3":285000,
    "UTAV":175000,
    "TIV2":350000,
    "Tornado Attack":145000,
    "DOW3":50000,
    "DOW6":130000,
    "Sedan":10000

};

let users = {};
let messages = [];

let ownerAssigned =
Object.values(playerData)
.some(
p => p.role === "Owner"
);

function getRoles(){

    let roles = {};

    for(let player in playerData){

        roles[player] =
        playerData[player].role;

    }

    return roles;

}

function getMoney(){

    let money = {};

    for(let player in playerData){

        money[player] =
        playerData[player].money;

    }

    return money;

}

function updateEveryone(){

    io.emit("userData",{

        users:Object.values(users),

        roles:getRoles(),

        money:getMoney()

    });

}

io.on("connection",(socket)=>{

    socket.on(
    "registerUser",
    (username)=>{

        users[socket.id] =
        username;

        if(!playerData[username]){

            playerData[username] = {

                money:
                STARTING_MONEY,

                role:
                ownerAssigned
                ? "Member"
                : "Owner",

                inventory:[]

            };

            if(!ownerAssigned){

                ownerAssigned =
                true;

            }

            savePlayers();

        }

        socket.emit(
            "inventory",
            playerData[username]
            .inventory
        );

        socket.emit(
            "loadMessages",
            messages
        );

        updateEveryone();

    });

    socket.on(
    "sendMessage",
    (data)=>{

        data.role =
        playerData[
        data.user
        ]?.role
        || "Member";

        messages.push(data);

        io.emit(
            "newMessage",
            data
        );

    });

    socket.on(
    "buyItem",
    (data)=>{

        const user =
        data.user;

        const item =
        data.item;

        if(!shop[item])
        return;

        const price =
        shop[item];

        if(
        playerData[user]
        .money < price
        ){

            return;

        }

        playerData[user]
        .money -= price;

        playerData[user]
        .inventory.push(item);

        savePlayers();

        socket.emit(
        "inventory",
        playerData[user]
        .inventory
        );

        updateEveryone();

    });

    socket.on(
    "setMoney",
    (data)=>{

        const staff =
        data.staff;

        if(

        playerData[staff]
        ?.role !== "Owner"

        &&

        playerData[staff]
        ?.role !== "Admin"

        ){

            return;

        }

        playerData[
        data.target
        ].money =

        Number(data.amount);

        savePlayers();

        updateEveryone();

    });

    socket.on(
    "addMoney",
    (data)=>{

        const staff =
        data.staff;

        if(

        playerData[staff]
        ?.role !== "Owner"

        &&

        playerData[staff]
        ?.role !== "Admin"

        ){

            return;

        }

        playerData[
        data.target
        ].money +=

        Number(data.amount);

        savePlayers();

        updateEveryone();

    });

    socket.on(
    "removeMoney",
    (data)=>{

        const staff =
        data.staff;

        if(

        playerData[staff]
        ?.role !== "Owner"

        &&

        playerData[staff]
        ?.role !== "Admin"

        ){

            return;

        }

        playerData[
        data.target
        ].money -=

        Number(data.amount);

        if(

        playerData[
        data.target
        ].money < 0

        ){

            playerData[
            data.target
            ].money = 0;

        }

        savePlayers();

        updateEveryone();

    });

    socket.on(
    "makeAdmin",
    (data)=>{

        const staff =
        data.staff;

        if(

        playerData[staff]
        ?.role !== "Owner"

        ){

            return;

        }

        playerData[
        data.target
        ].role =

        "Admin";

        savePlayers();

        updateEveryone();

    });

    socket.on(
    "removeAdmin",
    (data)=>{

        const staff =
        data.staff;

        if(

        playerData[staff]
        ?.role !== "Owner"

        ){

            return;

        }

        playerData[
        data.target
        ].role =

        "Member";

        savePlayers();

        updateEveryone();

    });

    socket.on(
    "disconnect",
    ()=>{

        delete users[
        socket.id
        ];

        updateEveryone();

    });

});



()=>{
const PORT =
process.env.PORT || 3000;

server.listen(
PORT,
()=>{

console.log(
"GPSCR running on port " +
PORT
);

});
