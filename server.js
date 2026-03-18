const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

app.post("/log", async (req, res) => {
    try {
        const { uid } = req.body;

        console.log("UID received:", uid);

        const snapshot = await db
            .collection("users")
            .where("rfidCardId", "==", uid)
            .get();

        if (snapshot.empty) {
            await db.collection("logs").add({
                uid,
                name: "Unknown",
                action: "Denied",
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
            });

            return res.json({ access: false });
        }

        const userDoc = snapshot.docs[0];
        const user = userDoc.data();

        if (user.status !== "approved") {
            await db.collection("logs").add({
                uid,
                name: user.name,
                role: user.role,
                action: "Denied (Not Approved)",
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
            });

            return res.json({ access: false });
        }

        await db.collection("logs").add({
            uid,
            name: user.name,
            role: user.role,
            action: "Access Granted",
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        return res.json({
            access: true,
            name: user.name
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Error");
    }
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});