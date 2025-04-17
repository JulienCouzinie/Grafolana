import base64
from solders.transaction import Transaction
from GrafolanaBack.domain.transaction.config.dex_programs.dex_program_struct import LABEL, PROGRAM_ADDRESS
from GrafolanaBack.domain.transaction.config.dex_programs.swap_programs import swap_programs_data
import unittest

class Test_CreateConfig(unittest.TestCase):
    def test_ConfigDexProgram(self):
        for program in swap_programs_data.keys():
            print(f"{swap_programs_data.get(program).get(PROGRAM_ADDRESS)}: {swap_programs_data.get(program).get(LABEL)}" )

    

if __name__ == '__main__':
    unittest.main()
