const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const app = express();
const PORT = 5001;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

const showsFile = path.join(__dirname, "shows.json");
const bookingsFile = path.join(__dirname, "bookings.json"); 
const citiesFile = path.join(__dirname, "cities.json");

// File Operations
const readShows = () => {
    try {
        if (!fs.existsSync(showsFile)) return [];
        const data = fs.readFileSync(showsFile, "utf8");
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error("Error reading shows:", error);
        return [];
    }
};

const writeShows = (shows) => {
    try {
        fs.writeFileSync(showsFile, JSON.stringify(shows, null, 2), "utf8");
    } catch (error) {
        console.error("Error writing shows:", error);
    }
};

const readBookings = () => {
    try {
        if (!fs.existsSync(bookingsFile)) return [];
        const data = fs.readFileSync(bookingsFile, "utf8");
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error("Error reading bookings:", error);
        return [];
    }
};

const writeBookings = (bookings) => {
    try {
        fs.writeFileSync(bookingsFile, JSON.stringify(bookings, null, 2), "utf8");
    } catch (error) {
        console.error("Error writing bookings:", error);
    }
};

const readCities = () => {
    try {
        if (!fs.existsSync(citiesFile)) return [];
        const data = fs.readFileSync(citiesFile, "utf8");
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error("Error reading cities:", error);
        return [];
    }
};

const writeCities = (cities) => {
    try {
        fs.writeFileSync(citiesFile, JSON.stringify(cities, null, 2), "utf8");
    } catch (error) {
        console.error("Error writing cities:", error);
    }
};

// Get all cities
app.get("/cities", (req, res) => {
    try {
        const cities = readCities();
        res.json(cities);
    } catch (error) {
        res.status(500).json({ message: "Error fetching cities", error: error.message });
    }
});

// Add new city
app.post("/admin/add-city", (req, res) => {
    const { name, theaters } = req.body;
    if (!name) {
        return res.status(400).json({ message: "City name is required" });
    }
    let cities = readCities();
    const newCity = {
        id: new Date(Date.now()).toISOString(),
        name,
        theaters: theaters || []
    };
    cities.push(newCity);
    writeCities(cities);
    res.json({ message: "City added successfully", city: newCity });
});

// Get all shows
app.get("/admin/shows", (req, res) => {
    try {
        const shows = readShows();
        res.json(shows);
    } catch (error) {
        res.status(500).json({ message: "Error fetching shows", error: error.message });
    }
});

// Add new show
app.post("/admin/add-show", (req, res) => {
    const { 
        name, 
        date, 
        time, 
        cityId, 
        theaterId, 
        roomId, 
        price, 
        description, 
        imageUrl,
        seatLayout 
    } = req.body;

    if (!name || !date || !time || !cityId || !theaterId || !roomId || !price || !imageUrl || !seatLayout) {
        return res.status(400).json({ 
            message: "All fields including city, theater, room, and seat layout are required" 
        });
    }

    let shows = readShows();
    const newShow = {
        id: new Date(Date.now()).toISOString(),
        name,
        date,
        time,
        cityId,
        theaterId,
        roomId,
        price,
        description,
        status: "active",
        imageUrl,
        seatLayout,
        bookedSeats: []
    };
    shows.push(newShow);
    writeShows(shows);
    res.json({ message: "Show added successfully", show: newShow });
});

// Get shows by city
app.get("/shows/:cityId", (req, res) => {
    try {
        const { cityId } = req.params;
        const shows = readShows();
        const cityShows = shows.filter(show => 
            show.cityId === cityId && 
            show.status === "active"
        );
        res.json(cityShows);
    } catch (error) {
        res.status(500).json({ message: "Error fetching shows", error: error.message });
    }
});

// Book tickets
app.post("/book-tickets", (req, res) => {
    try {
        const { showId, selectedSeats, userDetails, showDetails } = req.body;

        if (!showId || !selectedSeats || !userDetails || !showDetails) {
            return res.status(400).json({ 
                message: "Show ID, selected seats, user details, and show details are required" 
            });
        }

        let shows = readShows();
        const showIndex = shows.findIndex(show => show.id === showId);
        
        if (showIndex === -1) {
            return res.status(404).json({ message: "Show not found" });
        }

        const show = shows[showIndex];
        
        // Check if seats are available
        const isSeatsAvailable = selectedSeats.every(seat => 
            !show.bookedSeats.includes(seat)
        );

        if (!isSeatsAvailable) {
            return res.status(400).json({ 
                message: "One or more selected seats are already booked" 
            });
        }

        const bookingId = new Date(Date.now()).toISOString();
        const booking = {
            bookingId: bookingId,
            showId,
            showName: showDetails.name,
            showDateTime: `${showDetails.date} at ${showDetails.time}`,
            cityId: show.cityId,
            theaterId: show.theaterId,
            theaterName: showDetails.theaterName,
            roomId: show.roomId,
            seats: selectedSeats,
            totalAmount: showDetails.price * selectedSeats.length,
            userDetails: {
                ...userDetails,
                bookingDate: new Date().toISOString()
            },
            status: "confirmed"
        };

        // Update show's booked seats
        shows[showIndex].bookedSeats = [...shows[showIndex].bookedSeats, ...selectedSeats];
        
        let bookings = readBookings();
        bookings.push(booking);
        writeBookings(bookings);
        writeShows(shows);
        
        res.json({ 
            message: "Booking confirmed", 
            bookingId: booking.bookingId,
            booking,
            remainingSeats: show.seatLayout.totalSeats - shows[showIndex].bookedSeats.length
        });
    } catch (error) {
        console.error("Booking error:", error);
        res.status(500).json({ message: "Error processing booking", error: error.message });
    }
});

// Get booking history
app.get("/bookings/:userId", (req, res) => {
    try {
        const { userId } = req.params;
        console.log('Fetching bookings for user:', userId);
        
        const bookings = readBookings();
        console.log('All bookings:', bookings);
        
        const userBookings = bookings.filter(
            booking => booking.userDetails && booking.userDetails.userId === userId
        );
        console.log('User bookings:', userBookings);
        
        res.json(userBookings);
    } catch (error) {
        console.error("Error fetching bookings:", error);
        res.status(500).json({ message: "Error fetching bookings", error: error.message });
    }
});

// Cancel booking
app.post("/cancel-booking", (req, res) => {
    try {
        const { bookingId } = req.body;
        if (!bookingId) {
            return res.status(400).json({ message: "Booking ID is required" });
        }

        let bookings = readBookings();
        const bookingIndex = bookings.findIndex(b => b.bookingId === bookingId);
        
        if (bookingIndex === -1) {
            return res.status(404).json({ message: "Booking not found" });
        }

        const booking = bookings[bookingIndex];
        let shows = readShows();
        const showIndex = shows.findIndex(show => show.id === booking.showId);
        
        if (showIndex !== -1) {
            // Remove the booked seats
            shows[showIndex].bookedSeats = shows[showIndex].bookedSeats.filter(
                seat => !booking.seats.includes(seat)
            );
            writeShows(shows);
        }

        // Update booking status
        bookings[bookingIndex].status = "cancelled";
        writeBookings(bookings);
        
        res.json({ 
            message: "Booking cancelled successfully", 
            booking: bookings[bookingIndex]
        });
    } catch (error) {
        console.error("Error cancelling booking:", error);
        res.status(500).json({ message: "Error cancelling booking", error: error.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`BookMyShow Server running on http://localhost:${PORT}`);
}); 