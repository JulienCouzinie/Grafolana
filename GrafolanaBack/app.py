from typing import List, Dict, Any, Optional
from flask import Flask, request, jsonify
from flask_cors import CORS
#from GrafolanaBack.grafolanas_utils import get_orders, getTransaction
#from GrafolanaBack.utils.transaction_utils.transaction_parser import get_transaction_graph_data
from GrafolanaBack.domain.metadata import metadata_service
from GrafolanaBack.domain.transaction.services.transaction_parser_service import TransactionParserService


app = Flask(__name__)
cors = CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})

transaction_parser_service = TransactionParserService()

# @app.route('/api/get_orders_from_wallet', methods=['POST'])
# def get_orders_from_wallet():
#     pub_key = request.json.get('walletkey')
#     to_timestamp = int(request.json.get('endTime'))
#     from_timestamp = int(request.json.get('startTime'))

#     orders = get_orders(pub_key, from_timestamp, to_timestamp)

#     return jsonify([order.to_dict() for order in orders])

@app.route('/api/get_transaction_from_signature', methods=['POST'])
def get_transaction_from_signature():
    return transaction_parser_service.getJSONTransaction(request.json.get('tx_signature'))


@app.route('/api/get_transaction_graph_data', methods=['POST'])
def get_transaction_graph_data_from_signature():
    #return jsonify(get_transaction_graph_data(request.json.get('tx_signature'), "EQyYgCnwwZxuh3SfnrFBEiFqDUUSfpqiDorf66eqdEcz"))
    tx_signature = request.json.get('tx_signature')
    user_wallet = request.json.get('user_wallet', "EQyYgCnwwZxuh3SfnrFBEiFqDUUSfpqiDorf66eqdEcz")
        
    # Get the graph data
    graph_data = transaction_parser_service.get_transaction_graph_data(tx_signature)
    
    return jsonify(graph_data)

@app.route('/api/get_wallet_graph_data', methods=['POST'])
def get_wallet_graph_data_from_address():
    wallet_signature = request.json.get('wallet_signature')

    # Get the graph data
    graph_data = transaction_parser_service.get_wallet_graph_data(wallet_signature)
    
    return jsonify(graph_data)

# Metadata API Endpoints
@app.route('/api/metadata/get_mints_info', methods=['POST'])
def get_mints_info_from_addresses():
    mint_addresses: List[str] = request.json.get('addresses')
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
    program_metadatas = metadata_service.get_program_metadata(program_addresses)
    if not program_metadatas:
        return jsonify([])
    else:
        return jsonify(program_metadatas)


if __name__ == '__main__':
    app.run(debug=True)
