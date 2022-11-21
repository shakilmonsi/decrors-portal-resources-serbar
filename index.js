const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const { query } = require("express");
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();
// middielware.............
app.use(cors());
app.use(express.json());
// password user admin14
//1 c deotorsprotale
//2 apponment

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fm710lc.mongodb.net/?retryWrites=true&w=majority`;

console.log(uri);
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("unauthorized access");
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}
async function run() {
  try {
    const appointmentOptionCollection = client
      .db("dectorProtealandddata")
      .collection("apponmentesanddatassss");

    const bookingsCollection = client
      .db("dectorProtealandddata")
      .collection("bookings");
    const usersCollection = client
      .db("dectorProtealandddata")
      .collection("users");
    const doctorsCollection = client
      .db("dectorProtealandddata")
      .collection("doctors");

    app.get("/apponment", async (req, res) => {
      // class 5 add date fext---------------------------
      const date = req.query.date;

      console.log("date is ok", date);
      const query = {};
      const options = await appointmentOptionCollection.find(query).toArray();
      console.log("tis is option", options);
      const bookingQuery = { appointmentDat: date };
      const alreadyBooked = await bookingsCollection
        .find(bookingQuery)
        .toArray();
      console.log("this is booked", alreadyBooked);
      // code carefully :D
      options.forEach((option) => {
        const optionBooked = alreadyBooked.filter(
          (book) => book.treatment === option.name
        );
        console.log(optionBooked);
        const bookedSlots = optionBooked.map((book) => book.slot);

        const remainingSlots = option.slots.filter(
          (slot) => !bookedSlots.includes(slot)
        );
        option.slots = remainingSlots;
      });
      res.send(options);
    });

    app.get("/v2/apponment", async (req, res) => {
      const date = req.query.date;
      const options = await appointmentOptionCollection
        .aggregate([
          {
            $lookup: {
              from: "bookings",
              localField: "name",
              foreignField: "treatment",
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$appointmentDate", date],
                    },
                  },
                },
              ],
              as: "booked",
            },
          },
          {
            $project: {
              name: 1,
              slots: 1,
              booked: {
                $map: {
                  input: "$booked",
                  as: "book",
                  in: "$$book.slot",
                },
              },
            },
          },
          {
            $project: {
              name: 1,
              slots: {
                $setDifference: ["$slots", "$booked"],
              },
            },
          },
        ])
        .toArray();
      res.send(options);
    });
    // class 76-2 add specialtuy -----------------
    app.get("/appointmentSpecialty", async (req, res) => {
      const query = {};
      const result = await appointmentOptionCollection
        .find(query)
        .project({ name: 1 })
        .toArray();
      res.send(result);
    });

    // add booking and data  -------------------------------------------------      --------------------

    app.get("/bookings", async (req, res) => {
      const email = req.query.email;
      // const decodedEmail = req.decoded.email;
      // if (email !== decodedEmail) {
      //   return res.status(403).send({ message: "forbidden access" });
      // }
      const query = { email: email };
      const bookings = await bookingsCollection.find(query).toArray();
      res.send(bookings);
    });

    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      console.log(booking);
      const query = {
        appointmentDate: booking.appointmentDate,
        email: booking.email,
        treatment: booking.treatment,
      };
      const alreadyBooked = await bookingsCollection.find(query).toArray();
      if (alreadyBooked.length) {
        const message = `You already have a booking on ${booking.appointmentDate}`;
        return res.send({ acknowledged: false, message });
      }
      const result = await bookingsCollection.insertOne(booking);

      res.send(result);
    });
    // class 75 add jwt token ------------------------------..>
    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "1h",
        });
        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: "" });
    });
    // class 75-7 add usersAll path

    app.get("/users", async (req, res) => {
      const query = {};
      const users = await usersCollection.find(query).toArray();
      res.send(users);
    });
    // class admin  and ;;;;;;;;;;;;;;;;;;;;;;;;;;;.,.............
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      console.log(user);
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    // class 8 add admin  and link ,//////////////////////////////
    app.put("/users/admin/:id", verifyJWT, async (req, res) => {
      // add veriyi add main admin and jwt  token and ;;;;;;;;;;;;;;;;.,
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }
      //add admin verify admin.......................
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const option = { upsert: true };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(
        filter,
        updatedDoc,
        option
      );
      res.send(result);
    });
    // class 76 -5  add doctors link create ...................

    app.get("/doctors", async (req, res) => {
      const query = {};
      const doctors = await doctorsCollection.find(query).toArray();
      res.send(doctors);
    });

    // class 76 -5  add doctors link create ...................
    app.post("/doctors", async (req, res) => {
      const doctor = req.body;
      const result = await doctorsCollection.insertOne(doctor);
      res.send(result);
    });
  } finally {
  }
}
run().catch(console.log);

app.get("/", async (req, res) => {
  res.send("doctors portal server is raning");
});
app.listen(port, () => console.log(`doctor por${port}`));
