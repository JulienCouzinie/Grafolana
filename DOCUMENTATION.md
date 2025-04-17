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

    5. Run migrations:

    cd GrafolanaBack
    python -m alembic upgrade head
