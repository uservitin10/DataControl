import codecs

input_path = "database/inventory_items_export.csv"
output_path = "database/inventory_items_export_fixed.csv"

fixed_count = 0
total_count = 0

with open(input_path, "rb") as f_in:
    lines = f_in.readlines()

with open(output_path, "wb") as f_out:
    for line in lines:
        total_count += 1
        try:
            # tenta decodificar como UTF-8 puro — se der certo, está OK
            line.decode("utf-8")
            f_out.write(line)
        except UnicodeDecodeError:
            # falhou como UTF-8: assume que foi salva errado como Windows-1252
            # e corrige, recodificando para UTF-8 de verdade
            try:
                fixed_line = line.decode("windows-1252").encode("utf-8")
                f_out.write(fixed_line)
                fixed_count += 1
            except UnicodeDecodeError:
                # nem isso funcionou — grava como está e avisa
                f_out.write(line)
                print(f"⚠️ Linha {total_count} não pôde ser corrigida automaticamente")

print(f"Total de linhas processadas: {total_count}")
print(f"Linhas corrigidas: {fixed_count}")
print(f"Arquivo corrigido salvo em: {output_path}")