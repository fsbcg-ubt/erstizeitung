#!/usr/bin/env python3
"""
CSV Markdown Escaping Validator

Validates that CSV files in the data/ directory have properly escaped
Markdown patterns that would cause rendering issues when processed by knitr::kable().

Problematic pattern: digit(s) followed by period and space at cell start (e.g., "07. ")
This triggers Markdown ordered list syntax, generating malformed HTML.

Solution: Escape the period with backslash (e.g., "07\\. ")

Exit codes:
  0: All CSV files valid
  1: Validation errors found
  2: Script execution error
"""

import csv
import re
import sys
from pathlib import Path
from typing import List, Tuple

# Pattern: one or more digits, followed by period and space at string start
# Negative lookbehind ensures the period isn't already escaped with backslash
UNESCAPED_ORDERED_LIST = re.compile(r'^(\d+)\.(\s)', re.MULTILINE)
ESCAPED_ORDERED_LIST = re.compile(r'^(\d+)\\.(\s)', re.MULTILINE)


class ValidationError:
    """Represents a CSV validation error"""

    def __init__(self, file_path: Path, row: int, col: int, col_name: str, value: str):
        self.file_path = file_path
        self.row = row
        self.col = col
        self.col_name = col_name
        self.value = value

    def __str__(self) -> str:
        # Create suggested fix by escaping the period
        fixed_value = UNESCAPED_ORDERED_LIST.sub(r'\1\\.\2', self.value, count=1)

        return (
            f"\n❌ {self.file_path}:{self.row}:{self.col}\n"
            f"   Column: '{self.col_name}'\n"
            f"   Problem: Unescaped Markdown ordered list pattern detected\n"
            f"   Value:   '{self.value}'\n"
            f"   Fix:     '{fixed_value}'\n"
            f"   ℹ️  Escape the period with backslash to prevent Markdown parsing"
        )


def validate_csv_file(csv_path: Path) -> List[ValidationError]:
    """
    Validate a single CSV file for unescaped Markdown patterns.

    Args:
        csv_path: Path to CSV file

    Returns:
        List of validation errors (empty if valid)
    """
    errors = []

    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            # Use semicolon as delimiter (standard for this project)
            reader = csv.reader(f, delimiter=';')

            # Read header row for column names
            try:
                headers = next(reader)
            except StopIteration:
                print(f"⚠️  Skipping empty file: {csv_path}", file=sys.stderr)
                return errors

            # Check each data row
            for row_num, row in enumerate(reader, start=2):  # Start at 2 (header is row 1)
                for col_num, cell_value in enumerate(row):
                    # Skip empty cells
                    if not cell_value or not cell_value.strip():
                        continue

                    # Check if cell starts with unescaped ordered list pattern
                    if UNESCAPED_ORDERED_LIST.match(cell_value):
                        # Verify it's not already escaped
                        if not ESCAPED_ORDERED_LIST.match(cell_value):
                            col_name = headers[col_num] if col_num < len(headers) else f"Column {col_num + 1}"
                            errors.append(ValidationError(
                                file_path=csv_path,
                                row=row_num,
                                col=col_num + 1,
                                col_name=col_name,
                                value=cell_value
                            ))

    except Exception as e:
        print(f"❌ Error reading {csv_path}: {e}", file=sys.stderr)
        sys.exit(2)

    return errors


def main() -> int:
    """
    Main validation function.

    Returns:
        Exit code (0 = success, 1 = validation errors, 2 = execution error)
    """
    # Find data directory relative to script location
    script_dir = Path(__file__).parent
    repo_root = script_dir.parent.parent
    data_dir = repo_root / 'data'

    if not data_dir.exists():
        print(f"❌ Data directory not found: {data_dir}", file=sys.stderr)
        return 2

    # Find all CSV files
    csv_files = list(data_dir.glob('*.csv'))

    if not csv_files:
        print("ℹ️  No CSV files found in data/ directory", file=sys.stderr)
        return 0

    print(f"🔍 Validating {len(csv_files)} CSV file(s)...")

    # Validate each file
    all_errors = []
    for csv_file in sorted(csv_files):
        errors = validate_csv_file(csv_file)
        if errors:
            all_errors.extend(errors)
        else:
            print(f"  ✅ {csv_file.name}")

    # Report results
    if all_errors:
        print(f"\n{'='*80}")
        print(f"❌ Found {len(all_errors)} validation error(s) in CSV files:")
        print(f"{'='*80}")

        for error in all_errors:
            print(error)

        print(f"\n{'='*80}")
        print("📖 See data/AGENTS.md for CSV escaping guidelines")
        print(f"{'='*80}\n")

        return 1
    else:
        print(f"\n✅ All CSV files passed validation!")
        return 0


if __name__ == '__main__':
    sys.exit(main())
