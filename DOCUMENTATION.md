Setup:

## Setup and Installation

### Prerequisites

- Docker and Docker Compose
- PostgreSQL
- Python 3.10+
- Node.js 18+

### Setting Up the Backend
    First set PYTHONPATH to correct Path
    export PYTHONPATH=/f/Développement/Python/Grafolana

    1. Open backend folder

    cd GrafolanaBack/

    2. Create and activate python Virtual Environment:

    python -m venv venv
    source ./venv/Scripts/Activate

    3. Install all required packages:

    pip install -r requirements.txt

    4. Start PostgreSQL using Docker:

    cd ..
    docker-compose up -d postgres

    5. Define Environement VAR (see at the end of this file)

    6. Run migrations:

    cd GrafolanaBack
    python -m alembic upgrade head

## Settinp Up the Frontend
    1. Open frontend folder
    cd GrafolanaFront

    2. Install the dependencies
    pnpm install

    3. Build the artifacts
    pnpm build

    4. Environement VAR (see at the end of this file)


## Run the projet:

    1. Run Backend:
    cd GrafolanaBack
    flask run --no-reload --no-debug

    2. Run Frontend:
    cd GrafolanaFront
    pnpm start






## ENV VAR BACKEND
# Database configuration
DB_USER=
DB_PASSWORD=
DB_HOST=
DB_PORT=
DB_NAME=

# Flask settings
FLASK_APP=app.py
FLASK_ENV=development
FLASK_DEBUG=1


## ENV VAR FRONTEND example
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000/api