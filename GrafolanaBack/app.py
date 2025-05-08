import os
from typing import List, Dict, Any, Optional
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_compress import Compress
from GrafolanaBack.domain.metadata import metadata_service
from GrafolanaBack.domain.prices.sol_price_utils import start_price_updater
from GrafolanaBack.domain.transaction.services.transaction_parser_service import TransactionParserService
from GrafolanaBack.domain.spam.service import SpamService
from GrafolanaBack.domain.spam.model import Creator
from GrafolanaBack.domain.infrastructure.db.migration_service import check_and_run_migrations
from solders.signature import Signature
from solders.pubkey import Pubkey
from dotenv import load_dotenv

load_dotenv()
CORS_DOMAIN = os.getenv("CORS_DOMAIN")
PORT = int(os.getenv("PORT", 5000))

app = Flask(__name__)
application = app  # For WSGI compatibility
handler = app  # For Vercel compatibility

# Configure Flask to listen on all interfaces (0.0.0.0) - critical for Render deployment
# app.config['SERVER_NAME'] = f"0.0.0.0:{PORT}"

# Run database migrations if needed
check_and_run_migrations()

cors = CORS(
    app,
    resources={r"/*": {"origins": CORS_DOMAIN}},
    supports_credentials=True,
    methods=["GET", "HEAD", "POST", "OPTIONS", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"]
)

# Add CORS headers to every response
@app.after_request
def after_request(response):
    if CORS_DOMAIN:
        response.headers.add('Access-Control-Allow-Origin', CORS_DOMAIN)
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response


compress = Compress()
compress.init_app(app)

start_price_updater()  # Start the price updater in a separate thread

transaction_parser_service = TransactionParserService()
spam_service = SpamService()

@app.route("/")
def hello():
  return """

    Flask is working

  """

@app.route('/api/get_transaction_from_signature', methods=['POST'])
def get_transaction_from_signature():
    tx_signature = request.json.get('tx_signature')

    if Signature.verify(tx_signature) is None:
        return jsonify({"error": "Invalid transaction signature"}), 400

    return transaction_parser_service.getJSONTransaction(tx_signature)


@app.route('/api/get_transaction_graph_data', methods=['POST'])
def get_transaction_graph_data_from_signature():
    tx_signature = request.json.get('tx_signature')
    user_wallet = request.json.get('user_wallet', "EQyYgCnwwZxuh3SfnrFBEiFqDUUSfpqiDorf66eqdEcz")

    if not tx_signature:
        return jsonify({"error": "No transaction signature provided"}), 400
    
    try:
        Signature.from_string(tx_signature)
    except ValueError:
        return jsonify({"error": "Invalid transaction signature"}), 400

    # Get the graph data
    graph_data = transaction_parser_service.get_transaction_graph_data(tx_signature)
    
    return jsonify(graph_data)

@app.route('/api/get_wallet_graph_data', methods=['POST'])
def get_wallet_graph_data_from_address():
    wallet_signature = request.json.get('wallet_signature')

    if not wallet_signature:
        return jsonify({"error": "No wallet address provided"}), 400

    try:
        Pubkey.from_string(wallet_signature)
    except ValueError:
        return jsonify({"error": "Invalid wallet address"}), 400

    # Get the graph data
    graph_data = transaction_parser_service.get_wallet_graph_data(wallet_signature)
    
    return jsonify(graph_data)

@app.route('/api/get_block_graph_data', methods=['POST'])
def get_block_graph_data_from_slot():
    slot_number = request.json.get('slot_number')

    if not slot_number:
        return jsonify({"error": "No block slot provided"}), 400

    try:
        int(slot_number)
    except ValueError:
        return jsonify({"error": "Invalid block slot"}), 400

    # Get the graph data
    graph_data = transaction_parser_service.get_block_graph(slot_number)
    
    return jsonify(graph_data)

# Metadata API Endpoints
@app.route('/api/metadata/get_mints_info', methods=['POST'])
def get_mints_info_from_addresses():
    mint_addresses: List[str] = request.json.get('addresses')
    if not mint_addresses:
        return jsonify({"error": "No mint addresses provided"}), 400

    token_data_list = metadata_service.get_token_metadata(mint_addresses)
    return jsonify(token_data_list)

@app.route('/api/metadata/labels', methods=['POST'])
def get_labels():
    """
    Endpoint to retrieve labels for a list of addresses.
    
    Request JSON format:
    {
        "addresses": ["address1", "address2", ...],
        "user_id": "optional_user_id"
    }
    """
    data = request.json
    addresses: List[str] = data.get('addresses', [])
    user_id: Optional[str] = data.get('user_id')
    
    if not addresses:
        return jsonify({"error": "No addresses provided"}), 400
    
    labels = metadata_service.get_labels(addresses, user_id)
    return jsonify(labels)

@app.route('/api/metadata/labels/user', methods=['POST', 'DELETE'])
def manage_user_labels():
    """
    Endpoint to create, update, or delete user-specific labels.
    """
    data = request.json
    address: str = data.get('address')
    user_id: str = data.get('user_id')
    
    if not address or not user_id:
        return jsonify({"error": "Address and user_id are required"}), 400
        
    if request.method == 'POST':
        label_text: str = data.get('label')
        description: Optional[str] = data.get('description')
        
        if not label_text:
            return jsonify({"error": "Label is required"}), 400
            
        result = metadata_service.create_or_update_user_label(
            address, label_text, user_id, description
        )
        return jsonify(result)
        
    elif request.method == 'DELETE':
        success = metadata_service.delete_user_label(address, user_id)
        if success:
            return jsonify({"status": "success", "message": "Label deleted"})
        else:
            return jsonify({"status": "not_found", "message": "Label not found"}), 404

@app.route('/api/metadata/programs', methods=['POST'])
def get_program_metadata():
    program_addresses = request.json.get('addresses')
    if not program_addresses:
        return jsonify({"error": "No program addresses provided"}), 400
    program_metadatas = metadata_service.get_program_metadata(program_addresses)
    if not program_metadatas:
        return jsonify([])
    else:
        return jsonify(program_metadatas)

@app.route('/api/metadata/spam', methods=['POST'])
def get_spam_for_user():
    """
    Endpoint to retrieve all ADMIN/DEFAULT spam plus user-specific spam.
    
    Request JSON format:
    {
        "user_id": "user_identifier"
    }
    """
    data = request.json
    user_id = data.get('user_id')
    
    spam_addresses = spam_service.get_spam_for_user(user_id)
    return jsonify(spam_addresses)

@app.route('/api/metadata/spam/create', methods=['POST'])
def create_spam():
    """
    Endpoint to create a new spam entry.
    
    Request JSON format:
    {
        "address": "solana_address",
        "creator": "DEFAULT|ADMIN|OWNER|USER",
        "user_id": "optional_user_id"
    }
    """
    data = request.json
    address = data.get('address')
    user_id = data.get('user_id')
    
    if not address:
        return jsonify({"error": "Address is required"}), 400
        
    # Validate creator type

    creator = Creator.USER

    try:
        spam = spam_service.create_spam(address=address, creator=creator, user_id=user_id)
        return jsonify(spam), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/metadata/spam/delete', methods=['DELETE'])
def delete_spam():
    """
    Endpoint to delete a spam entry.
    
    Request JSON format:
    {
        "spam_id": 123,
        "user_id": "user_identifier"
    }
    """
    data = request.json
    spam_id = data.get('spam_id')
    user_id = data.get('user_id')
    
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
        
    if not spam_id:
        return jsonify({"error": "Spam ID is required"}), 400
        
    if spam_service.delete_user_spam(spam_id, user_id):
        return jsonify({"status": "success", "message": "Spam entry deleted successfully"}), 200
    else:
        return jsonify({"status": "not_found", "message": "Spam entry not found or you don't have permission to delete it"}), 404


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=PORT)
