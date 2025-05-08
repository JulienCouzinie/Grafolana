import base64
from solders.transaction import Transaction
from GrafolanaBack.domain.transaction.config.dex_programs.swap_programs import swap_programs_data
import unittest

class Test_CreateConfig(unittest.TestCase):
    def test_ConfigDexProgram(self):
        for program in swap_programs_data.keys():
            print(f"{program}: Optional[SwapProgram]")

    

if __name__ == '__main__':
    unittest.main()
