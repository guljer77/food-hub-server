const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
var jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

//middleware
const corsOptions = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());
//jwt-verify
const verifyJWt = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: "unAuthorized user" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unAuthorized user" });
    }
    req.decoded = decoded;
    next();
  });
};

//food-hub
//y9nGCnlCrTp0DBla
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.igfrycv.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const userCollection = client.db("foodDb").collection("users");
    const foodCollection = client.db("foodDb").collection("foods");
    const userFoodCollection = client.db("foodDb").collection("userFoods");
    const bookingCollection = client.db("foodDb").collection("bookings");
    const commentCollection = client.db("foodDb").collection("comments");

    //json-web-token-api
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    //veryAdmin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (user?.role !== "admin") {
        return res
          .status(401)
          .send({ error: true, message: "unAuthorized user" });
      }
      next();
    };
    //user-related-apis
    app.get("/users/admin/:email", verifyJWt, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });
    //get-user-api
    app.get("/users/admin", verifyJWt, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    //save-user-api
    app.put("/users/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const query = { email: email };
      const option = { upsert: true };
      const updateDoc = {
        $set: {
          ...user,
        },
      };
      const result = await userCollection.updateOne(query, updateDoc, option);
      res.send(result);
    });
    //make-admin-user
    app.patch("/users/admin/:id", verifyJWt, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    //delete-user-api
    app.delete("/users/admin/:id", verifyJWt, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    //food-related-apis-by-admin
    app.post("/foods/admin", verifyJWt, verifyAdmin, async (req, res) => {
      const food = req.body;
      const result = await foodCollection.insertOne(food);
      res.send(result);
    });
    app.get("/foods/admin", async (req, res) => {
      const result = await foodCollection.find().toArray();
      res.send(result);
    });
    app.get("/foods/admin/:id", verifyJWt, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodCollection.findOne(query);
      res.send(result);
    });
    app.put("/foods/admin/:id", verifyJWt, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const food = req.body;
      const query = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const updateDoc = {
        $set: {
          ...food,
        },
      };
      const result = await foodCollection.updateOne(query, updateDoc, option);
      res.send(result);
    });
    app.delete("/foods/admin/:id", verifyJWt, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await foodCollection.deleteOne(filter);
      res.send(result);
    });
    app.get("/admin/bookings", async (req, res) => {
      const result = await bookingCollection.find().toArray();
      res.send(result);
    });
    app.patch('/admin/bookings/:id', verifyJWt, verifyAdmin, async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const updateDoc = {
        $set:{
          status: "Confirm"
        }
      }
      const result = await bookingCollection.updateOne(query, updateDoc);
      res.send(result);
    })

    //add-food-by-user
    app.post("/userFoods", verifyJWt, async (req, res) => {
      const food = req.body;
      const result = await userFoodCollection.insertOne(food);
      res.send(result);
    });
    app.get("/userFoods", verifyJWt, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res
          .status(403)
          .send({ error: true, message: "Forbidden Access" });
      }
      const query = { email: email };
      const result = await userFoodCollection.find(query).toArray();
      res.send(result);
    });
    app.delete("/userFoods/:id", verifyJWt, async (req, res) => {
      const id = req.params.id;
      const food = { _id: new ObjectId(id) };
      const result = await userFoodCollection.deleteOne(food);
      res.send(result);
    });
    //bookings-user
    app.post("/bookings", verifyJWt, async (req, res) => {
      const book = req.body;
      const result = await bookingCollection.insertOne(book);
      res.send(result);
    });
    app.get("/bookings", verifyJWt, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res
          .status(403)
          .send({ error: true, message: "Forbidden Access" });
      }
      const query = { email: email };
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });
    //user-comment
    app.post('/comments', verifyJWt, async(req, res)=>{
      const comment = req.body;
      const result = await commentCollection.insertOne(comment);
      res.send(result);
    })
    app.get('/comments', verifyJWt, async(req, res)=>{
      const result = await commentCollection.find().toArray();
      res.send(result);
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("server running");
});
app.listen(port, () => {
  console.log(`server running on port: ${port}`);
});
