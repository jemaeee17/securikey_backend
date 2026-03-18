const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
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

        const user = snapshot.docs[0].data();

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
            name: user.name,
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Error");
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});