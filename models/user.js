const { pool } = require('../config');
const { validationResult } = require('express-validator');

function createUser(email, loc) {
    return pool.query('INSERT into users (email, created_at, loc) values ($1, current_timestamp, $2) ON CONFLICT DO NOTHING', [email, loc]);
}

const User = {
    // subscribes a user
    async registerUser (request, response) {
        // Finds the validation errors in this request and wraps them in an object
        const errors = validationResult(request);
        if (!errors.isEmpty()) {
            return response.status(422).json({ errors: errors.array() });
        } else {
            try {
                await createUser(request.body.email, 'San Francisco');
                return response.status(200).render('signup-success', {email: request.body.email, error: false});
            } catch (error) {
                console.log(error);
                return response.status(500).render('signup-success', {email: request.body.email, error: true});
            }
        }
    }
};

module.exports = User;

