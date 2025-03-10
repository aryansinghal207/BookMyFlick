const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = 5001;
app.use(express.json());
const showsFile = path.join(__dirname, "shows.json");
const bookingsFile = path.join(__dirname, "bookings.json");

// Shows File Operations
const readShows = () => {
    if (!fs.existsSync(showsFile)) return [];
    const data = fs.readFileSync(showsFile, "utf8");
    return data ? JSON.parse(data) : [];
};
const writeShows = (shows) => {
    fs.writeFileSync(showsFile, JSON.stringify(shows, null, 2), "utf8");
};

// Bookings File Operations
const readBookings = () => {
    if (!fs.existsSync(bookingsFile)) return [];
    const data = fs.readFileSync(bookingsFile, "utf8");
    return data ? JSON.parse(data) : [];
};

const writeBookings = (bookings) => {
    fs.writeFileSync(bookingsFile, JSON.stringify(bookings, null, 2), "utf8");
};  

// Get all shows
app.get("/admin/shows", (req, res) => {
    const shows = readShows();
    res.json(shows);
});

// Add new show
app.post("/admin/add-show", (req, res) => {
    const { name, date, time, totalSeats, price, description } = req.body;
    if (!name || !date || !time || !totalSeats || !price) {
        return res.status(400).json({ 
            message: "Name, date, time, total seats, and price are required" 
        });
    }
    let shows = readShows();
    const newShow = {
        id: new Date(Date.now()).toISOString(),
        name,
        date,
        time,
        totalSeats,
        availableSeats: totalSeats,
        price,
        description,
        status: "active"
    };
    shows.push(newShow);
    writeShows(shows);
    res.json({ message: "Show added successfully", show: newShow });
});

// Update show
app.put("/admin/update-show", (req, res) => {
    const { id, ...updateData } = req.body;
    if (!id) {
        return res.status(400).json({ message: "Show ID is required" });
    }
    let shows = readShows();
    const showIndex = shows.findIndex(show => show.id === id);
    if (showIndex === -1) {
        return res.status(404).json({ message: "Show not found" });
    }
    shows[showIndex] = { ...shows[showIndex], ...updateData };
    writeShows(shows);
    res.json({ message: "Show updated", show: shows[showIndex] });
});

// Delete show
app.delete("/admin/delete-show", (req, res) => {
    const { id } = req.body;
    if (!id) {
        return res.status(400).json({ message: "Show ID is required" });
    }
    let shows = readShows();
    const filteredShows = shows.filter(show => show.id !== id);
    if (shows.length === filteredShows.length) {
        return res.status(404).json({ message: "Show not found" });
    }
    writeShows(filteredShows);
    res.json({ message: "Show deleted successfully" });
});

// Get all available shows
app.get("/shows", (req, res) => {
    const shows = readShows();
    const activeShows = shows.filter(show => 
        show.status === "active" && show.availableSeats > 0
    );
    res.json(activeShows);
});

// Book tickets
app.post("/book-tickets", (req, res) => {
    const { showId, numberOfSeats, userDetails } = req.body;
    if (!showId || !numberOfSeats || !userDetails) {
        return res.status(400).json({ 
            message: "Show ID, number of seats, and user details are required" 
        });
    }
    let shows = readShows();
    const showIndex = shows.findIndex(show => show.id === showId);
    if (showIndex === -1) {
        return res.status(404).json({ message: "Show not found" });
    }
    const show = shows[showIndex];
    if (show.availableSeats < numberOfSeats) {
        return res.status(400).json({ 
            message: "Not enough seats available" 
        });
    }
    let bookings = readBookings();
    const booking = {
        id: new Date(Date.now()).toISOString(),
        showId,
        showName: show.name,
        numberOfSeats,
        totalAmount: show.price * numberOfSeats,
        userDetails,
        bookingDate: new Date().toISOString(),
        status: "confirmed"
    };
    shows[showIndex].availableSeats -= numberOfSeats;
    bookings.push(booking);
    writeBookings(bookings);
    writeShows(shows);
    res.json({ 
        message: "Booking confirmed", 
        booking,
        remainingSeats: shows[showIndex].availableSeats
    });
});

// Get booking history
app.get("/bookings/:userId", (req, res) => {
    const { userId } = req.params;
    
    const bookings = readBookings();
    const userBookings = bookings.filter(
        booking => booking.userDetails.userId === userId
    );

    res.json(userBookings);
});

// Cancel booking
app.post("/cancel-booking", (req, res) => {
    const { bookingId } = req.body;
    if (!bookingId) {
        return res.status(400).json({ message: "Booking ID is required" });
    }
    let bookings = readBookings();
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
    }
    let shows = readShows();
    const showIndex = shows.findIndex(show => show.id === booking.showId);
    if (showIndex !== -1) {
        shows[showIndex].availableSeats += booking.numberOfSeats;
        writeShows(shows);
    }
    booking.status = "cancelled";
    writeBookings(bookings);
    res.json({ 
        message: "Booking cancelled successfully", 
        booking 
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`BookMyShow Server running on http://localhost:${PORT}`);
}); 